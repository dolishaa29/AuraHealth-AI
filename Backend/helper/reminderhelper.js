let nodemailer=require("nodemailer");
let Reminder=require("../model/reminder");
let DoseLog=require("../model/doseLog");
let {emailTemplate}=require("./emailtemplate");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS_KEY
  },
});



function isValidTime(time)
{
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time));
}



function isValidDate(date)
{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date)))
    {
        return false;
    }
    let d=new Date(date+"T00:00:00Z");
    if(isNaN(d))
    {
        return false;
    }
    return d.toISOString().slice(0,10)===date;
}



function isValidTimezone(timezone)
{
    try{
        new Intl.DateTimeFormat("en",{timeZone:timezone});
        return true;
    }
    catch(err)
    {
        return false;
    }
}



function addDays(date,days)
{
    let d=new Date(date+"T00:00:00Z");
    d.setUTCDate(d.getUTCDate()+days);
    return d.toISOString().slice(0,10);
}



function localDateTime(timezone,at)
{
    if(!at)
    {
        at=new Date();
    }
    let parts=new Intl.DateTimeFormat("en-CA",{
        timeZone:timezone,
        year:"numeric",
        month:"2-digit",
        day:"2-digit",
        hour:"2-digit",
        minute:"2-digit",
        hourCycle:"h23"
    }).formatToParts(at);

    let p={};
    for(let part of parts)
    {
        p[part.type]=part.value;
    }

    return {
        date:p.year+"-"+p.month+"-"+p.day,
        time:p.hour+":"+p.minute
    };
}



function runsOnDate(reminder,date)
{
    if(date<reminder.startDate)
    {
        return false;
    }
    if(reminder.endDate && date>reminder.endDate)
    {
        return false;
    }
    return true;
}



async function markEmailSent(reminder,date,time)
{
    try{
        let result=await DoseLog.updateOne(
            {reminder:reminder._id,date:date,time:time,status:null,emailSent:{$ne:true}},
            {$set:{emailSent:true},$setOnInsert:{user:reminder.user._id}},
            {upsert:true}
        );
        return result.modifiedCount===1 || result.upsertedCount===1;
    }
    catch(err)
    {
        if(err.code===11000)
        {
            return false;
        }
        throw err;
    }
}



async function sendReminderEmail(reminder,time)
{
    let user=reminder.user;
    let name=user.name || "there";

    let text="Hi "+name+",\n\nIt's "+time+". Time to take "+reminder.medicine;
    if(reminder.dosage)
    {
        text=text+" ("+reminder.dosage+")";
    }
    text=text+".";
    if(reminder.notes)
    {
        text=text+"\nNote: "+reminder.notes;
    }
    if(process.env.FRONTEND_URL)
    {
        text=text+"\n\nMark it as taken: "+process.env.FRONTEND_URL+"/reminders";
    }
    text=text+"\n\nStay healthy,\nAuraHealth";

    let tiles=[
        {icon:"💊",label:"Medicine",value:reminder.medicine,color:"indigo"},
        {icon:"⏰",label:"Time",value:time,color:"orange"}
    ];
    if(reminder.dosage)
    {
        tiles.push({icon:"📏",label:"Dosage",value:reminder.dosage,color:"green"});
    }

    let details=[];
    if(reminder.notes)
    {
        details.push({label:"Note",value:reminder.notes});
    }
    if(reminder.endDate)
    {
        details.push({label:"Course ends on",value:reminder.endDate});
    }

    const mail = {
        from: process.env.EMAIL,
        to: user.email,
        subject: "Time for your "+reminder.medicine+" 💊",
        text: text,
        html: emailTemplate({
            label:"Medicine reminder",
            badge:"⏰ Due now · "+time,
            icon:"💊",
            title:"Time for your "+reminder.medicine,
            subtitle:"A small step for a healthier you.",
            preview:"It's "+time+" — time to take "+reminder.medicine,
            name:user.name,
            message:"This is your scheduled reminder. Take your medicine now, then mark it as taken so your weekly progress stays up to date.",
            tiles:tiles,
            detailsTitle:details.length>0 ? "Details" : null,
            details:details,
            buttonText:"Mark as taken",
            buttonLink:process.env.FRONTEND_URL ? process.env.FRONTEND_URL+"/reminders" : null,
            alert:{type:"info",text:"You're getting this because email alerts are on for this reminder. You can turn them off anytime on the Reminders page."}
        })
    };
    await transporter.sendMail(mail);
}



async function sendDueReminderEmails()
{
    let timezones=await Reminder.distinct("timezone",{active:true,emailAlert:true});
    let now=new Date();
    let oneMinuteAgo=new Date(now.getTime()-60*1000);

    for(let timezone of timezones)
    {
        for(let at of [now,oneMinuteAgo])
        {
            let {date,time}=localDateTime(timezone,at);

            let reminders=await Reminder.find({
                active:true,
                emailAlert:true,
                timezone:timezone,
                times:time
            }).populate("user","name email");

            for(let reminder of reminders)
            {
                if(!reminder.user || !reminder.user.email || !runsOnDate(reminder,date))
                {
                    continue;
                }

                let canSend=await markEmailSent(reminder,date,time);
                if(!canSend)
                {
                    continue;
                }

                try{
                    await sendReminderEmail(reminder,time);
                }
                catch(err)
                {
                    console.log("Reminder email failed:",err.message);
                    await DoseLog.updateOne({reminder:reminder._id,date:date,time:time},{$set:{emailSent:false}});
                }
            }
        }
    }
}



function startReminderScheduler()
{
    let running=false;

    let timer=setInterval(async()=>
    {
        if(running)
        {
            return;
        }
        running=true;
        try{
            await sendDueReminderEmails();
        }
        catch(err)
        {
            console.log("Reminder scheduler error:",err.message);
        }
        running=false;
    },60*1000);

    console.log("Reminder scheduler started");
    return ()=>clearInterval(timer);
}



module.exports={
    isValidTime,
    isValidDate,
    isValidTimezone,
    addDays,
    localDateTime,
    runsOnDate,
    startReminderScheduler
};
