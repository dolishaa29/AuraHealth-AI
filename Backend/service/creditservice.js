let crypto=require("crypto");
let mongoose=require("mongoose");
let Razorpay=require("razorpay");
let Payment=require("../model/payment");
let CreditTransaction=require("../model/creditTransaction");
let {CREDIT_COSTS,CREDIT_PACKS,findPack,getBalance,addCredits}=require("../helper/credithelper");

let razorpay=null;

function getRazorpay()
{
    let keyId=process.env.RAZORPAY_KEY_ID;
    let keySecret=process.env.RAZORPAY_KEY_SECRET;

    if(!keyId || !keySecret)
    {
        return null;
    }
    if(!razorpay)
    {
        razorpay=new Razorpay({key_id:keyId,key_secret:keySecret});
    }
    return razorpay;
}




function makeSignature(secret,text)
{
    return crypto.createHmac("sha256",secret).update(text).digest("hex");
}



function signaturesMatch(expected,received)
{
    let a=Buffer.from(String(expected));
    let b=Buffer.from(String(received || ""));
    if(a.length!==b.length)
    {
        return false;
    }
    return crypto.timingSafeEqual(a,b);
}




async function markPaidAndAddCredits(orderId,paymentId)
{
    let session=await mongoose.startSession();
    let balance=null;

    try{
        await session.withTransaction(async()=>
        {
            balance=null;

            let payment=await Payment.findOneAndUpdate(
                {orderId:orderId,status:{$ne:"paid"}},
                {$set:{status:"paid",paymentId:paymentId}},
                {returnDocument:"after",session:session}
            );
            if(!payment)
            {
                return;
            }

            let pack=findPack(payment.packId);
            let packName=pack ? pack.name : payment.packId;
            balance=await addCredits(payment.user,payment.credits,"Bought "+packName+" pack",orderId,session);
        });
    }
    finally{
        await session.endSession();
    }

    return balance;
}




exports.getWallet=async(req,res)=>
{
    try{
    let userId=req.user._id;

    let balance=await getBalance(userId);
    let transactions=await CreditTransaction.find({user:userId}).sort({createdAt:-1}).limit(30);

    return res.status(200).json({
        success:true,
        balance:balance,
        costs:CREDIT_COSTS,
        packs:CREDIT_PACKS,
        transactions:transactions,
        paymentsEnabled:getRazorpay()!==null
    });
    }
    catch(err)
    {
        console.log("Loading wallet failed:",err.message);
        res.status(500).json({success:false,msg:"Couldn't load your credits. Please try again."});
    }
}




exports.createOrder=async(req,res)=>
{
    try{
    let user=req.user;
    let pack=findPack(req.body.packId);

    if(!pack)
    {
        return res.status(400).json({success:false,msg:"Please choose a valid credit pack"});
    }

    let rzp=getRazorpay();
    if(!rzp)
    {
        return res.status(503).json({success:false,msg:"Payments are not set up yet. Please try again later."});
    }

    let order=await rzp.orders.create({
        amount:pack.price*100,
        currency:"INR",
        receipt:"credits_"+Date.now(),
        notes:{userId:String(user._id),packId:pack.id}
    });

    await Payment.create({
        user:user._id,
        orderId:order.id,
        packId:pack.id,
        credits:pack.credits,
        amount:order.amount
    });

    return res.status(201).json({
        success:true,
        orderId:order.id,
        amount:order.amount,
        currency:order.currency,
        keyId:process.env.RAZORPAY_KEY_ID,
        pack:pack,
        user:{
            name:user.name,
            email:user.email,
            contact:user.contact ? String(user.contact) : ""
        }
    });
    }
    catch(err)
    {
        console.log("Creating Razorpay order failed:",err.error || err.message);
        res.status(502).json({success:false,msg:"Couldn't start the payment. Please try again."});
    }
}




exports.verifyPayment=async(req,res)=>
{
    try{
    let userId=req.user._id;
    let orderId=req.body.razorpay_order_id;
    let paymentId=req.body.razorpay_payment_id;
    let signature=req.body.razorpay_signature;

    if(!orderId || !paymentId || !signature)
    {
        return res.status(400).json({success:false,msg:"Payment details are missing"});
    }
    if(!getRazorpay())
    {
        return res.status(503).json({success:false,msg:"Payments are not set up yet."});
    }

    let payment=await Payment.findOne({orderId:orderId,user:userId});
    if(!payment)
    {
        return res.status(404).json({success:false,msg:"Order not found"});
    }

    let expected=makeSignature(process.env.RAZORPAY_KEY_SECRET,orderId+"|"+paymentId);
    if(!signaturesMatch(expected,signature))
    {
        return res.status(400).json({success:false,msg:"Payment could not be verified"});
    }

    await markPaidAndAddCredits(orderId,paymentId);
    let balance=await getBalance(userId);

    return res.status(200).json({
        success:true,
        msg:payment.credits+" credits added to your wallet",
        balance:balance
    });
    }
    catch(err)
    {
        console.log("Verifying payment failed:",err.message);
        res.status(500).json({
            success:false,
            msg:"Payment received but credits weren't added yet. They will be added automatically in a few minutes."
        });
    }
}



exports.razorpayWebhook=async(req,res)=>
{
    try{
    let secret=process.env.RAZORPAY_WEBHOOK_SECRET;
    if(!secret)
    {
        return res.status(503).json({success:false});
    }

    let expected=makeSignature(secret,req.rawBody || "");
    if(!signaturesMatch(expected,req.headers["x-razorpay-signature"]))
    {
        return res.status(400).json({success:false});
    }

    let event=req.body.event;
    let payload=req.body.payload || {};
    let paymentEntity=payload.payment ? payload.payment.entity : null;

    if(!paymentEntity)
    {
        return res.status(200).json({success:true});
    }

    if(event==="payment.captured" || event==="order.paid")
    {
        await markPaidAndAddCredits(paymentEntity.order_id,paymentEntity.id);
    }

    if(event==="payment.failed")
    {
        await Payment.updateOne(
            {orderId:paymentEntity.order_id,status:"created"},
            {$set:{status:"failed",paymentId:paymentEntity.id}}
        );
    }

    return res.status(200).json({success:true});
    }
    catch(err)
    {
        console.log("Razorpay webhook failed:",err.message);
        res.status(500).json({success:false});
    }
}
