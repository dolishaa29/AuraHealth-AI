let crypto=require("crypto");
let mongoose=require("mongoose");
let Razorpay=require("razorpay");
let Payment=require("../model/payment");
let CreditTransaction=require("../model/creditTransaction");
let {CREDIT_COSTS,CREDIT_PACKS,findPack,getBalance,addCredits}=require("../helper/credithelper");
const { maxFeeForPayment, bookingPaymentFilter } = require("../config/consultationPricing");

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




function checkoutMode() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const mode = keyId?.startsWith("rzp_live_") ? "live" : keyId?.startsWith("rzp_test_") ? "test" : null;
    return mode && getRazorpay() ? mode : null;
}

async function markPaidAndAddCredits(entity)
{
    if (!entity || entity.status !== "captured" || entity.currency !== "INR"
        || typeof entity.id !== "string" || typeof entity.order_id !== "string"
        || !Number.isSafeInteger(entity.amount) || entity.amount <= 0 || entity.amount_refunded > 0) return null;

    return mongoose.connection.transaction(async (session) => {
        const payment = await Payment.findOne({
            orderId: entity.order_id, amount: entity.amount, fundingBlocked: { $ne: true },
        }).session(session);
        if (!payment || (payment.status === "paid" && payment.paymentId !== entity.id)) return null;
        if (payment.status === "paid") return payment;

        const cap = payment.consultationBundle && payment.liveFunding
            ? maxFeeForPayment(payment.amount, payment.credits, entity.fee) : 0;
        payment.status = "paid";
        payment.paymentId = entity.id;
        payment.bookingCreditsRemaining = payment.consultationBundle && (!payment.liveFunding || cap) ? payment.credits : 0;
        payment.maxDoctorFeePaise = cap;
        await payment.save({ session });
        const walletCredits = payment.consultationBundle ? payment.aiCredits : payment.credits;
        const reason = payment.consultationBundle && !payment.liveFunding ? "Test checkout" : "Bought credit pack";
        if (walletCredits > 0) await addCredits(payment.user, walletCredits, reason, payment.orderId, session);
        return payment;
    });
}




exports.getWallet=async(req,res)=>
{
    try{
    let userId=req.user._id;

    const [balance, transactions, booking] = await Promise.all([
        getBalance(userId),
        CreditTransaction.find({user:userId}).sort({createdAt:-1}).limit(30),
        Payment.aggregate([
            { $match: { ...bookingPaymentFilter(), user: userId } },
            { $group: { _id: null, credits: { $sum: "$bookingCreditsRemaining" } } },
        ]),
    ]);

    const mode = checkoutMode();
    return res.status(200).json({
        success:true,
        balance:balance,
        bookingCredits: booking[0]?.credits ?? 0,
        costs:CREDIT_COSTS,
        packs:CREDIT_PACKS,
        transactions:transactions,
        paymentsEnabled:Boolean(mode),
        checkoutMode:mode
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
    let pack=findPack(req.body?.packId);

    if(!pack)
    {
        return res.status(400).json({success:false,msg:"Please choose a valid credit pack"});
    }

    const mode = checkoutMode();
    if(!mode)
    {
        return res.status(503).json({success:false,msg:"Checkout is unavailable."});
    }

    const rzp = getRazorpay();
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
        amount:pack.price*100,
        consultationBundle:true,
        liveFunding:mode === "live",
        aiCredits:pack.aiCredits
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
    let { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};

    if(typeof orderId !== "string" || !/^order_[A-Za-z0-9]+$/.test(orderId)
        || typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentId)
        || typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature))
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

    const entity = await getRazorpay().payments.fetch(paymentId);
    if (entity.id !== paymentId || entity.order_id !== orderId || entity.amount !== payment.amount || entity.currency !== "INR") {
        return res.status(400).json({success:false,msg:"Payment doesn't match this order."});
    }
    const credited = await markPaidAndAddCredits(entity);
    if (!credited) return res.status(409).json({success:false,msg:"Payment is not confirmed as captured or its funding is on hold."});
    let balance=await getBalance(userId);

    return res.status(200).json({
        success:true,
        msg:credited.consultationBundle && !credited.liveFunding
            ? "Test payment confirmed. Consultation and AI credits are ready."
            : credited.consultationBundle
            ? (credited.maxDoctorFeePaise ? "Payment confirmed. Consultation and AI credits are ready." : "Payment confirmed. Consultation funding is on hold for review.")
            : payment.credits+" AI credits added to your wallet",
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
    if (event === "refund.created" || event === "refund.processed" || event === "payment.dispute.created") {
        const paymentId = payload.refund?.entity?.payment_id || payload.dispute?.entity?.payment_id;
        if (typeof paymentId === "string") {
            const entity = await getRazorpay().payments.fetch(paymentId);
            await Payment.updateOne({ orderId: entity.order_id, $or: [{ paymentId }, { status: { $ne: "paid" } }] },
                { $set: { fundingBlocked: true, bookingCreditsRemaining: 0 } });
        }
        return res.status(200).json({success:true});
    }
    let paymentEntity=payload.payment ? payload.payment.entity : null;

    if(!paymentEntity)
    {
        return res.status(200).json({success:true});
    }

    if(event==="payment.captured" || event==="order.paid")
    {
        await markPaidAndAddCredits(paymentEntity);
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
