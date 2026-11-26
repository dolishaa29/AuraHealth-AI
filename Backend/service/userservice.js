let rec=require("../model/user");
let rec2=require("../model/Appointment/appointment");
const CancelledAppointment = require("../model/Appointment/cancelledAppointment");
let otps=require("../model/OTP");
let pendingUsers=require("../model/PendingUser");
let bcrypt=require("bcrypt");
let jwt=require("jsonwebtoken");
let crypto=require("crypto");
const nodemailer = require("nodemailer");
const cloudinary=require("../config/cloudinary");
let {emailTemplate,indiaTime}=require("../helper/emailtemplate");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS_KEY
  },

});

exports.userregister=async(req,res)=>
{
    try{
    let email=req.body.email;
    let password=req.body.password;
    let name=req.body.name;
    let contact=req.body.contact;
    let address=req.body.address;
    let user=await rec.findOne({email:email});
    if(user)
    {
        return res.status(400).json({msg:"user already exists"});
    }
    let hash=await bcrypt.hash(password,10);
    let otp=crypto.randomInt(100000,1000000).toString();

    await pendingUsers.findOneAndUpdate(
        {email:email},
        {email,name,password:hash,contact,address,otp,createdAt:Date.now()},
        {upsert:true,new:true}
    );

    const mail = {
        from: process.env.EMAIL,
        to: email,
        subject: "Email Verification OTP",
        text: `Your OTP to complete registration is: ${otp}. It is valid for 10 minutes.`,
        html: emailTemplate({
            label:"Account setup",
            badge:"✨ Welcome to AuraHealth",
            icon:"✉️",
            title:"Verify your email",
            subtitle:"One quick step and your account is ready.",
            preview:"Your AuraHealth verification code is "+otp,
            name:name,
            message:"Thanks for signing up! Enter the code below on the sign-up page to verify your email and activate your account.",
            code:otp,
            codeLabel:"Verification code",
            codeExpiry:"Expires in 10 minutes",
            tiles:[
                {icon:"🩺",label:"Consult",value:"Top doctors",color:"indigo"},
                {icon:"🤖",label:"AI tools",value:"Health insights",color:"green"},
                {icon:"💊",label:"Reminders",value:"Never miss a dose",color:"orange"}
            ],
            alert:{type:"info",title:"Didn't sign up?",text:"If you didn't create an AuraHealth account, you can safely ignore this email. Never share this code with anyone."}
        })
    };
    await transporter.sendMail(mail);

    return res.status(200).json({success:true, msg:"OTP sent to your email. Please verify to complete registration."});
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({msg:"internal server error"});
    }
}



exports.registerotpverify=async(req,res)=>
{
    try{
    let email=req.body.email;
    let otp=req.body.otp;
    let pending=await pendingUsers.findOne({email:email,otp:otp});
    if(!pending)
    {
        return res.status(400).json({success:false, msg:"Invalid or expired OTP"});
    }
    let newuser=new rec({
        email:pending.email,
        password:pending.password,
        name:pending.name,
        contact:pending.contact,
        address:pending.address
    });
    await newuser.save();
    await pendingUsers.deleteOne({email:email});
    return res.status(200).json({success:true, msg:"Registration successful. You can now login."});
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({msg:"internal server error"});
    }
}



exports.userlogin=async(req,res)=>
{
    try{
    let email=req.body.email;
    let password=req.body.password;
    let data=await rec.findOne({email:email});
    if(!data)
    {
        return res.status(400).json({msg:"user not found"});
    }
    if(data.userstatus==="block")
    {
        return res.status(403).json({
            success: false,
            msg: 'Your account is blocked by the admin. Login failed.'
        });
    }
    let lpass=data.password;
    let pass=await bcrypt.compare(password,lpass);
    if(pass)
    {
    let token=jwt.sign({token:data.email},process.env.JWT_SECRET,{expiresIn:"1d"});
    console.log("token:",token);
    res.status(200).json({msg:"user logged in successfully",token:token});
    }
    else{
        res.status(400).json({msg:"invalid password"});
    }
}
catch(err)
{
    console.log(err);
    res.status(500).json({msg:"internal server error"});
}
}



exports.userlogout=async(req,res)=>
{
    res.clearCookie("token");
    return res.status(200).json({success: true,msg:'user logout successfully'})
}


exports.userprofile=async(req,res)=>
{
    const user = req.user;
    return res.status(200).json({success: true,user})
}



exports.userlist=async(req,res)=>
{
    try{
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    if (!page || !limit) {
        let users=await rec.find();
        return res.status(200).json({users:users});
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        rec.find().skip(skip).limit(limit),
        rec.countDocuments(),
    ]);
    res.status(200).json({ users, total, page, totalPages: Math.ceil(total / limit) });
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({msg:"internal server error"});
    }
}

exports.userDashboard=async(req,res)=>
{
    const user =  req.user;
    return res.status(200).json({success: true,msg: "user dashboard fetched successfully",dashboard:
    {
     email:user.email,name:user.name,contact:user.contact,address:user.address,id:user._id
    },
    });
}

exports.userviewapp=async(req,res)=>{
    const filter = { userid: String(req.user._id) };
    const [appointments, cancelledAppointments] = await Promise.all([
        rec2.find(filter),
        CancelledAppointment.find(filter).sort({ cancelledAt: -1 }),
    ]);
    return res.status(200).json({ success: true, appointments, cancelledAppointments });
};

exports.otpgenerate=async(req,res)=>{
    const role="user";
    const email=(req.body.email||"").trim();
    if(!email){
        return res.status(400).json({success:false,msg:"email is required"});
    }
    try{
        let user=await rec.findOne({email:email});
        if(!user){
            return res.status(404).json({success:false,msg:"no user account found with this email"});
        }
        if(user.userstatus==="block"){
            return res.status(403).json({success:false,msg:"your account is blocked by the admin"});
        }
        let otp=crypto.randomInt(100000,1000000).toString();
        await otps.findOneAndUpdate(
            {email:email,role:role},
            {email:email,role:role,otp:otp,createdAt:Date.now()},
            {upsert:true}
        );
        try{
            await transporter.sendMail({
                from: process.env.EMAIL,
                to: email,
                subject: "Password Reset OTP",
                text: `Hi ${user.name || ""}, your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
                html: emailTemplate({
                    label:"Account security",
                    badge:"🔐 Account security",
                    icon:"🔐",
                    title:"Reset your password",
                    subtitle:"Use this code to confirm it's really you.",
                    preview:"Your AuraHealth password reset code is "+otp,
                    name:user.name,
                    message:"We received a request to reset the password for your AuraHealth account. Enter the code below to continue.",
                    code:otp,
                    codeLabel:"Reset code",
                    codeExpiry:"Expires in 10 minutes",
                    detailsTitle:"Request details",
                    details:[
                        {label:"Account",value:email},
                        {label:"Requested on",value:indiaTime()}
                    ],
                    alert:{type:"warning",title:"Wasn't you?",text:"Ignore this email and your password will stay the same. AuraHealth will never ask you for this code."}
                })
            });
        }catch(mailErr){
            console.log("User OTP mail error:", mailErr.message);
            await otps.deleteOne({email:email,role:role});
            return res.status(502).json({success:false,msg:"could not send OTP email, please try again later"});
        }
        return res.status(200).json({success:true,msg:"OTP sent to email"});
    }
    catch(err){
        console.log("User OTP generate error:", err);
        return res.status(500).json({success:false,msg:"could not generate OTP, please try again"});
    }
}

exports.otpverify=async(req,res)=>
{
    const role="user";
    const email=(req.body.email||"").trim();
    const otp=String(req.body.otp||"").trim();
    if(!email || !otp){
        return res.status(400).json({success:false,msg:"email and OTP are required"});
    }
    try
    {
        let record=await otps.findOne({email:email,otp:otp,role:role});
        if(!record){
            return res.status(400).json({success:false,msg:"invalid or expired OTP"});
        }
        let user=await rec.findOne({email:email});
        if(!user){
            return res.status(404).json({success:false,msg:"no user account found with this email"});
        }
        const oldHash=user.password;
        let password=crypto.randomBytes(8).toString("hex");
        let hp=await bcrypt.hash(password,10);
        await rec.updateOne({_id:user._id},{password:hp});
        try{
            await transporter.sendMail({
                from: process.env.EMAIL,
                to: email,
                subject: "New Password After OTP Verification",
                text: `Hi ${user.name || ""}, your OTP has been verified successfully. Your new password is: ${password}. Please change it after logging in.`,
                html: emailTemplate({
                    label:"Account security",
                    badge:"✅ Code verified",
                    icon:"🔑",
                    title:"Your new password is ready",
                    subtitle:"You can log in to your account again.",
                    preview:"Your AuraHealth password has been reset",
                    name:user.name,
                    message:"Your reset code was verified. We've created a new password for your account. Use it to log in.",
                    code:password,
                    codeLabel:"New password",
                    buttonText:"Log in to AuraHealth",
                    buttonLink:process.env.FRONTEND_URL ? process.env.FRONTEND_URL+"/login" : null,
                    stepsTitle:"Keep your account safe",
                    steps:[
                        {title:"Log in with this password",text:"Copy it exactly as shown above."},
                        {title:"Change it right away",text:"Go to your profile and set a password only you know."}
                    ],
                    alert:{type:"danger",title:"Didn't request this?",text:"Someone may be trying to access your account. Log in and change your password immediately."}
                })
            });
        }catch(mailErr){

            console.log("User new-password mail error:", mailErr.message);
            await rec.updateOne({_id:user._id},{password:oldHash});
            return res.status(502).json({success:false,msg:"could not send new password email, please try again"});
        }
        await otps.deleteOne({_id:record._id});
        return res.status(200).json({success:true,msg:"OTP verified successfully and new password sent to email"});
    }
    catch(err)
    {
        console.log("User OTP verify error:", err);
        return res.status(500).json({success:false,msg:"could not verify OTP, please try again"});
    }
}

exports.blockuser = async (req, res) => {
    try {

        const id = req.body.id;
        console.log("user "+id);
        const user = await rec.findById(id);

        const newStatus = user.userstatus === "block" ? "unblock" : "block";
        user.userstatus = newStatus;
        console.log(newStatus);
        await user.save();

        return res.status(200).json({
            success: true,
            msg: `User has been ${newStatus} successfully`,
            data: user
        });

    } catch (err) {
        console.log("hi")
        console.error("Error toggling doctor status:", err);
        res.status(500).json({
            success: false,
            msg: "Internal server error"
        });
    }
};

exports.userbyid=async(req,res)=>
{
try{
    let id=req.params.id;
    console.log(id);
    let data=await rec.findById(id);
    return res.status(200).json({
        success:true,
        user:data
    });
}
catch(err)
{
    console.log(err);
    res.status(500).json({status:false , msg:"internal server error"});
}
}

exports.changepassword=async(req,res)=>
{
    try{
    const user=req.user;
    let oldpassword=req.body.oldpassword;
    let newpassword=req.body.newpassword;
    let data=await rec.findById(user._id);
    let existing=data.password;
    let pass=await bcrypt.compare(oldpassword,existing);
    if(!pass)
    {
        return res.status(400).json({msg:"invalid old password"});
    }
    newpassword=await bcrypt.hash(newpassword,10);
    await rec.findByIdAndUpdate(user._id,{password:newpassword});
    return res.status(200).json({success:true, msg:"password updated successfully"});
}
catch(err)
{
    console.log(err);
    res.status(500).json({msg:"internal server error"});
}

}

exports.updateuser=async(req,res)=>
{
    try {
        const user=req.user;
        let image=user.image;

        if (req.file) {
            try {
                const result = await cloudinary.uploadBuffer(req.file.buffer, {
                    folder: "user-images",
                });
                if (result && result.secure_url) {
                    image = result.secure_url;
                }
            } catch (uploadErr) {
                console.log("Cloudinary upload error:", uploadErr);
            }
        }

        let updatedData={
            email:req.body.email,
            name:req.body.name,
            contact:req.body.contact,
            address:req.body.address,
            gender:req.body.gender,
            dob:req.body.dob,
            fatherName:req.body.fatherName,
            motherName:req.body.motherName,
            maritalStatus:req.body.maritalStatus || null,
            nationality:req.body.nationality,
            bloodGroup:req.body.bloodGroup,
            emergencyContactName:req.body.emergencyContactName,
            emergencyContactNumber:req.body.emergencyContactNumber,
            emergencyRelation:req.body.emergencyRelation,
            image:image,
        }
        let updateduser= await rec.findOneAndUpdate({_id:user._id},updatedData,{new:true});
        return res.status(200).json({ success: true, msg: "User profile updated successfully", user:updateduser });
    } catch (error) {
        console.error("Error in updateuser:", error);
        return res.status(500).json({ success: false, msg: "Internal server error" });
    }
}
