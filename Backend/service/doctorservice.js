let rec=require("../model/doctor");
let rec2=require("../model/permission");
let app=require("../model/Appointment/appointment");
let jwt=require("jsonwebtoken");
let otps=require("../model/OTP");
let bct=require("bcryptjs");
let crypto=require("crypto");
const nodemailer = require("nodemailer");
const cloudinary=require("../config/cloudinary")
const axios = require("axios");
let {emailTemplate,indiaTime}=require("../helper/emailtemplate");

async function geocodeAddress(address) {
    try {
        const res = await axios.get("https://nominatim.openstreetmap.org/search", {
            params: { format: "json", q: address, limit: 1 },
            headers: { "User-Agent": "AuraHealth/1.0 (telemedicine platform)" },
        });
        const hit = res.data?.[0];
        if (!hit) return null;
        return { type: "Point", coordinates: [parseFloat(hit.lon), parseFloat(hit.lat)] };
    } catch (err) {
        console.log("Geocoding error:", err.message);
        return null;
    }
}


const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS_KEY
  }
});


exports.doctorpermission=async(req,res)=>
{
    console.log("Doctor permission request body:", req.body);
    let email=req.body.email;
    let contact=req.body.contact;
    let name=req.body.name;
    let specialization=req.body.specialization;
    let address=req.body.address;
    let certificate = "";

    if (req.file) {
        try {
            const result = await cloudinary.uploadBuffer(req.file.buffer, {
                folder: "doctor-certificates",
                resource_type: "raw",
                format: "pdf",
            });
            certificate = result.secure_url;
        } catch (uploadErr) {
            console.log("Cloudinary upload error:", uploadErr);
            return res.status(500).json({ success: false, msg: "certificate upload failed" });
        }
    }

    let already = await rec2.findOne({ email: email });

if (already && (already.permission === "pending" || already.permission === "approved")) {
    return res.status(400).json({
        success: false,
        msg: "Doctor already exists with pending or approved permission"
    });
}
    else{
        let newdoctor=new rec2({
            email:email,
            contact:contact,
            name:name,
            specialization:specialization,
            address:address,
            certificate:certificate,

        });
        try {
            await newdoctor.save();
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({
                    success: false,
                    msg: "Doctor already exists with pending or approved permission"
                });
            }
            throw err;
        }
        return res.status(201).json({success: true,msg:'doctor registered , approval pending'})
    }
}

exports.doctorregister = async (req, res) => {
  try {

    console.log("Doctor registration request body:", req.body);

    let email = req.body.email;
    let contact = req.body.contact;
    let name = req.body.name;
    let specialization = req.body.specialization;
    let address = req.body.address;
    let password = crypto.randomBytes(4).toString("hex");

    let hp = await bct.hash(password, 10);
    let existing=await rec.findOne({email:email})
    if(existing)
    {

        return res.status(200).json({message:"already exist", alreadyRegistered:true})
    }
    let newdoctor = new rec({
      email: email,
      password: hp,
      contact: contact,
      name: name,
      specialization: specialization,
      address: address,

    });

    await newdoctor.save();

    const mail = {
      from: process.env.EMAIL,
      to: email,
      subject: "Registration Successful",
      text: `Hello Dr. ${name}, your account has been successfully registered and approved.
      Your login credentials are as follows:
      Email: ${email}
      Password: ${password}`,
      html: emailTemplate({
        label:"Doctor onboarding",
        badge:"🎉 Application approved",
        icon:"🩺",
        title:"Welcome aboard, Dr. "+name+"!",
        subtitle:"Your doctor account is approved and ready to use.",
        preview:"Your AuraHealth doctor account is approved",
        name:"Dr. "+name,
        message:"Great news! Our team has reviewed your application and certificate. Your account is now live, and patients can find and book you on AuraHealth.",
        tiles:[
          {icon:"✅",label:"Status",value:"Approved",color:"green"},
          {icon:"🩺",label:"Specialization",value:specialization || "Doctor",color:"indigo"}
        ],
        detailsTitle:"Your login details",
        details:[
          {label:"Email",value:email},
          {label:"Password",value:password}
        ],
        stepsTitle:"Get started in 3 steps",
        steps:[
          {title:"Log in to your dashboard",text:"Use the email and password above. Choose \"Doctor\" on the login page."},
          {title:"Change your password",text:"Set a new password only you know."},
          {title:"Complete your profile",text:"Add your photo and details so patients can trust and book you."}
        ],
        buttonText:"Open doctor dashboard",
        buttonLink:process.env.FRONTEND_URL ? process.env.FRONTEND_URL+"/login" : null,
        alert:{type:"warning",title:"Keep these details private",text:"Don't share your password with anyone, including AuraHealth staff."}
      })
    };

    try {
      await transporter.sendMail(mail);
    } catch (mailErr) {

      console.log("Doctor registration mail error:", mailErr);
      await rec.deleteOne({ _id: newdoctor._id });
      return res.status(500).json({ message: "could not send credentials email" });
    }

    res.json({ message: "doctor registered successfully and email sent" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "error in registration" });
  }
};

exports.doctorlogin=async(req,res)=>
{
 let email=req.body.email;
 let password=req.body.password;

 let data=await rec.findOne({email:email});
 if(!data)
 {
    return res.status(404).json({success: false,msg:'doctor not found'})
 }

if (data.doctorstatus === "block") {
        return res.status(403).json({
            success: false,
            msg: 'Your account is blocked by the admin. Login failed.'
        });
    }

 let lpass=data.password;
 let pass=await bct.compare(password,lpass);

 if(pass)
 {
    let token=jwt.sign({token:data.email,role:"doctor"},process.env.JWT_SECRET,{
        expiresIn:"1d"
    });
    return res.status(200).json({success: true,msg:'doctor login successfully',token});
 }
 else
 {
    return res.status(400).json({success: false,msg:'doctor login failed'})
 }
};

exports.doctorlogout=async(req,res)=>
{
    res.clearCookie("emstoken");
    return res.status(200).json({success: true,msg:'doctor logout successfully'})
}

exports.doctorprofile=async(req,res)=>
{
    const doctor = req.doctor;
    let doctorData = await rec.findById(doctor._id);
    if (!doctorData) {
        return res.status(404).json({ success: false, msg: "Doctor not found" });
    }

    return res.status(200).json({success: true,doctors:doctorData});
}

exports.doctorlist=async(req,res)=>
{
    let doctors=await rec.find({doctorstatus:"unblock"});

    return res.status(200).json({success: true,doctors})
}

exports.doctorrequest=async(req,res)=>
{
    console.log("Fetching doctor requests");
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    if (!page || !limit) {
        let doctors=await rec2.find();
        return res.status(200).json({success: true,doctors});
    }

    const skip = (page - 1) * limit;
    const [doctors, total] = await Promise.all([
        rec2.find().skip(skip).limit(limit),
        rec2.countDocuments(),
    ]);
    return res.status(200).json({ success: true, doctors, total, page, totalPages: Math.ceil(total / limit) });
}

exports.doctorpermissionupdate=async(req,res)=>
{
    id=req.body.id;
    let permission=req.body.permission;
    let updated=await rec2.findByIdAndUpdate(id,{permission:permission});
    return res.status(200).json({success:true,msg:"permission updated successfully",updated});
}

exports.doctorDashboard=async(req,res)=>
{
    const doctor =  req.doctor;
    return res.status(200).json({success: true,msg: "doctor dashboard fetched successfully",dashboard:
    {
     email:doctor.email,name:doctor.name,contact:doctor.contact,address:doctor.address,id:doctor._id
    },
    });
}

exports.doctorviewapp=async(req,res)=>{
    const doctor = req.doctor;
    console.log("Doctor ID from request:", doctor._id);
    let appointments = await app.find({ doctorid: doctor._id });

    console.log("Appointments for doctor:", appointments);
    return res.status(200).json({ success: true, appointments });
}

exports.doctorupdate = async (req, res) => {
    try {
        const doctor = req.doctor;
        let image = doctor.image;

        if (req.file) {
            try {
                const result = await cloudinary.uploadBuffer(req.file.buffer, {
                    folder: "doctor-images",
                });
                if (result && result.secure_url) {
                    image = result.secure_url;
                }
            } catch (uploadErr) {
                console.log("Cloudinary upload error:", uploadErr);
            }
        }

        let updateData = {
            name: req.body.name,
            specialization: req.body.specialization,
            contact: req.body.contact,
            address: req.body.address,
            gender: req.body.gender,
            hospitalName: req.body.hospitalName,
            HospitalAddress: req.body.HospitalAddress,
            bio: req.body.bio,
            experienceYears: req.body.experienceYears,
            title: req.body.title,
            institution: req.body.institution,
            year: req.body.year,
            image: image,
        };

        if (req.body.HospitalAddress && req.body.HospitalAddress !== doctor.HospitalAddress) {
            const location = await geocodeAddress(req.body.HospitalAddress);
            if (location) updateData.location = location;
        }

        let updatedDoctor = await rec.findOneAndUpdate({ _id: doctor._id }, updateData, { new: true });

        if (!updatedDoctor) {
            return res.status(444).json({ success: false, msg: "Doctor not found" });
        }

        return res.status(200).json({
            success: true,
            msg: "Doctor profile updated successfully",
            doctors: updatedDoctor
        });

    } catch (error) {
        console.error("Error in doctorupdate:", error);
        return res.status(500).json({ success: false, msg: "Internal server error" });
    }
};

exports.changePassword=async(req,res)=>
{
try{
    const doctor = req.doctor;
    let oldpassword=req.body.oldpassword;
    let newpassword=req.body.newpassword;
    let data=await rec.findById(doctor._id);
    let existpass=data.password;
    let pass=await bct.compare(oldpassword,existpass);
    if(!pass)    {
        return res.status(400).json({msg:"invalid old password"});
    }
    newpassword=await bct.hash(newpassword,10);
    await rec.findByIdAndUpdate(doctor._id,{password:newpassword});
    return res.status(200).json({msg:"password changed successfully"});
}
catch(err)
{
    console.log(err);
    res.status(500).json({msg:"internal server error"});
}
}

exports.doctorprofileview=async(req,res)=>
{
    id=req.params.id;
    console.log("Doctor profile view request for ID:", id);
    let doctor=await rec.findById({_id: id});
    if(!doctor)    {
        return res.status(404).json({success: false,msg:'doctor not found'})
    }
    return res.status(200).json({success: true,doctor:doctor});
}

exports.otpgenerate=async(req,res)=>{
    const role="doctor";
    const email=(req.body.email||"").trim();
    if(!email){
        return res.status(400).json({success:false,msg:"email is required"});
    }
    try{
        let doctor=await rec.findOne({email:email});
        if(!doctor){
            return res.status(404).json({success:false,msg:"no doctor account found with this email"});
        }
        if(doctor.doctorstatus==="block"){
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
                text: `Hi Dr. ${doctor.name || ""}, your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
                html: emailTemplate({
                    label:"Account security",
                    badge:"🔐 Account security",
                    icon:"🔐",
                    title:"Reset your password",
                    subtitle:"Use this code to confirm it's really you.",
                    preview:"Your AuraHealth password reset code is "+otp,
                    name:"Dr. "+(doctor.name || ""),
                    message:"We received a request to reset the password for your AuraHealth doctor account. Enter the code below to continue.",
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
            console.log("Doctor OTP mail error:", mailErr.message);
            await otps.deleteOne({email:email,role:role});
            return res.status(502).json({success:false,msg:"could not send OTP email, please try again later"});
        }
        return res.status(200).json({success:true,msg:"OTP sent to email"});
    }
    catch(err){
        console.log("Doctor OTP generate error:", err);
        return res.status(500).json({success:false,msg:"could not generate OTP, please try again"});
    }
}

exports.otpverify=async(req,res)=>
{
    const role="doctor";
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
        let doctor=await rec.findOne({email:email});
        if(!doctor){
            return res.status(404).json({success:false,msg:"no doctor account found with this email"});
        }
        const oldHash=doctor.password;
        let password=crypto.randomBytes(4).toString("hex");
        let hp=await bct.hash(password,10);
        await rec.updateOne({_id:doctor._id},{password:hp});
        try{
            await transporter.sendMail({
                from: process.env.EMAIL,
                to: email,
                subject: "New Password After OTP Verification",
                text: `Hi Dr. ${doctor.name || ""}, your OTP has been verified successfully. Your new password is: ${password}. Please change it after logging in.`,
                html: emailTemplate({
                    label:"Account security",
                    badge:"✅ Code verified",
                    icon:"🔑",
                    title:"Your new password is ready",
                    subtitle:"You can log in to your doctor account again.",
                    preview:"Your AuraHealth password has been reset",
                    name:"Dr. "+(doctor.name || ""),
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

            console.log("Doctor new-password mail error:", mailErr.message);
            await rec.updateOne({_id:doctor._id},{password:oldHash});
            return res.status(502).json({success:false,msg:"could not send new password email, please try again"});
        }
        await otps.deleteOne({_id:record._id});
        return res.status(200).json({success:true,msg:"OTP verified successfully and new password sent to email"});
    }
    catch(err)
    {
        console.log("Doctor OTP verify error:", err);
        return res.status(500).json({success:false,msg:"could not verify OTP, please try again"});
    }
}

exports.deletedoctor = async (req, res) => {
    try {
        console.log("hi")
        const id = req.body.id;
        console.log(id);
        const deletedDoctor = await rec.findByIdAndDelete(id);
        console.log(deletedDoctor)

        res.status(200).json({
            success: true,
            message: "Doctor ka record successfully delete kar diya gaya hai.",
            data: deletedDoctor
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server mein kuch gadbad hui.",
            error: error.message
        });
    }
};


exports.blockdoctor = async (req, res) => {
    try {

        const id = req.body.id;
        console.log(id);
        const doctor = await rec.findById(id);

        const newStatus = doctor.doctorstatus === "block" ? "unblock" : "block";
        doctor.doctorstatus = newStatus;
        await doctor.save();

        return res.status(200).json({
            success: true,
            msg: `Doctor has been ${newStatus} successfully`,
            data: doctor
        });

    } catch (err) {
        console.error("Error toggling doctor status:", err);
        res.status(500).json({
            success: false,
            msg: "Internal server error"
        });
    }
};

