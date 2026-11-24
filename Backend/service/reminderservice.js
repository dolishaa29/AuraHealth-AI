let mongoose=require("mongoose");
let Reminder=require("../model/reminder");
let DoseLog=require("../model/doseLog");
let {isValidTime,isValidDate,isValidTimezone,addDays,localDateTime,runsOnDate}=require("../helper/reminderhelper");


function checkReminderData(body)
{
    let medicine=String(body.medicine || "").trim();
    let dosage=String(body.dosage || "").trim();
    let notes=String(body.notes || "").trim();
    let startDate=String(body.startDate || "");
    let endDate=body.endDate ? String(body.endDate) : null;
    let timezone=body.timezone ? String(body.timezone) : "Asia/Kolkata";
    let times=body.times;

    if(medicine==="")
    {
        return {error:"Please enter the medicine name"};
    }
    if(!Array.isArray(times) || times.length===0)
    {
        return {error:"Add at least one time"};
    }

    times=[...new Set(times.map(String))].sort();

    if(times.length>6)
    {
        return {error:"You can add up to 6 times a day"};
    }
    for(let time of times)
    {
        if(!isValidTime(time))
        {
            return {error:"Invalid time: "+time};
        }
    }
    if(!isValidDate(startDate))
    {
        return {error:"Please choose a valid start date"};
    }
    if(endDate && (!isValidDate(endDate) || endDate<startDate))
    {
        return {error:"End date must be on or after the start date"};
    }
    if(!isValidTimezone(timezone))
    {
        return {error:"Invalid time zone"};
    }

    return {
        data:{
            medicine:medicine,
            dosage:dosage || null,
            notes:notes || null,
            times:times,
            startDate:startDate,
            endDate:endDate,
            timezone:timezone,
            emailAlert:Boolean(body.emailAlert)
        }
    };
}

exports.checkReminderData = checkReminderData;


exports.getReminders=async(req,res)=>
{
    try{
    let reminders=await Reminder.find({user:req.user._id}).sort({active:-1,createdAt:-1});
    return res.status(200).json({success:true,reminders:reminders});
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({success:false,msg:"internal server error"});
    }
}



exports.addReminder=async(req,res)=>
{
    try{
    let userId=req.user._id;

    let check=checkReminderData(req.body);
    if(check.error)
    {
        return res.status(400).json({success:false,msg:check.error});
    }

    let count=await Reminder.countDocuments({user:userId});
    if(count>=20)
    {
        return res.status(400).json({success:false,msg:"You can have up to 20 reminders"});
    }

    let reminder=await Reminder.create({...check.data,user:userId});
    return res.status(201).json({success:true,msg:"Reminder added",reminder:reminder});
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({success:false,msg:"internal server error"});
    }
}



exports.updateReminder=async(req,res)=>
{
    try{
    let id=req.params.id;
    let active=req.body.active;

    if(!mongoose.Types.ObjectId.isValid(id))
    {
        return res.status(404).json({success:false,msg:"Reminder not found"});
    }

    let reminder=await Reminder.findOne({_id:id,user:req.user._id});
    if(!reminder)
    {
        return res.status(404).json({success:false,msg:"Reminder not found"});
    }

    let onlyToggle=Object.keys(req.body).length===1 && typeof active==="boolean";

    if(!onlyToggle)
    {
        let check=checkReminderData(req.body);
        if(check.error)
        {
            return res.status(400).json({success:false,msg:check.error});
        }
        Object.assign(reminder,check.data);
    }

    if(typeof active==="boolean")
    {
        reminder.active=active;
    }

    await reminder.save();
    return res.status(200).json({success:true,msg:"Reminder updated",reminder:reminder});
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({success:false,msg:"internal server error"});
    }
}



exports.deleteReminder=async(req,res)=>
{
    try{
    let id=req.params.id;

    if(!mongoose.Types.ObjectId.isValid(id))
    {
        return res.status(404).json({success:false,msg:"Reminder not found"});
    }

    let result=await Reminder.deleteOne({_id:id,user:req.user._id});
    if(result.deletedCount===0)
    {
        return res.status(404).json({success:false,msg:"Reminder not found"});
    }

    await DoseLog.deleteMany({reminder:id});
    return res.status(200).json({success:true,msg:"Reminder deleted"});
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({success:false,msg:"internal server error"});
    }
}



exports.getToday=async(req,res)=>
{
    try{
    let userId=req.user._id;
    let date=req.query.date;
    if(!isValidDate(date))
    {
        date=localDateTime("Asia/Kolkata").date;
    }

    let reminders=await Reminder.find({user:userId,active:true});
    let logs=await DoseLog.find({user:userId,date:date});

    let doses=[];
    for(let reminder of reminders)
    {
        if(!runsOnDate(reminder,date))
        {
            continue;
        }
        for(let time of reminder.times)
        {
            let log=logs.find(l=>String(l.reminder)===String(reminder._id) && l.time===time);
            doses.push({
                reminderId:reminder._id,
                medicine:reminder.medicine,
                dosage:reminder.dosage,
                notes:reminder.notes,
                time:time,
                status:log ? log.status : null
            });
        }
    }
    doses.sort((a,b)=>a.time.localeCompare(b.time));

    let weekStart=addDays(date,-7);
    let yesterday=addDays(date,-1);

    let scheduled=0;
    for(let reminder of reminders)
    {
        for(let day=weekStart; day<=yesterday; day=addDays(day,1))
        {
            if(runsOnDate(reminder,day))
            {
                scheduled=scheduled+reminder.times.length;
            }
        }
    }

    let taken=await DoseLog.countDocuments({
        user:userId,
        reminder:{$in:reminders.map(r=>r._id)},
        date:{$gte:weekStart,$lte:yesterday},
        status:"taken"
    });
    taken=Math.min(taken,scheduled);

    let percent=null;
    if(scheduled>0)
    {
        percent=Math.round((taken/scheduled)*100);
    }

    return res.status(200).json({
        success:true,
        date:date,
        doses:doses,
        adherence:{scheduled:scheduled,taken:taken,percent:percent}
    });
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({success:false,msg:"internal server error"});
    }
}



exports.logDose=async(req,res)=>
{
    try{
    let userId=req.user._id;
    let reminderId=req.body.reminderId;
    let date=req.body.date;
    let time=req.body.time;
    let status=req.body.status;
    if(status===undefined)
    {
        status=null;
    }

    if(!mongoose.Types.ObjectId.isValid(reminderId) || !isValidDate(date) || !isValidTime(time))
    {
        return res.status(400).json({success:false,msg:"Invalid dose details"});
    }
    if(status!=="taken" && status!=="skipped" && status!==null)
    {
        return res.status(400).json({success:false,msg:"Status must be taken or skipped"});
    }

    let reminder=await Reminder.findOne({_id:reminderId,user:userId});
    if(!reminder || !reminder.times.includes(time) || !runsOnDate(reminder,date))
    {
        return res.status(404).json({success:false,msg:"This dose isn't part of your schedule"});
    }

    await DoseLog.updateOne(
        {reminder:reminder._id,date:date,time:time},
        {$set:{status:status},$setOnInsert:{user:userId}},
        {upsert:true}
    );

    let msg=status ? "Marked as "+status : "Dose reset";
    return res.status(200).json({success:true,msg:msg});
    }
    catch(err)
    {
        console.log(err);
        res.status(500).json({success:false,msg:"internal server error"});
    }
}
