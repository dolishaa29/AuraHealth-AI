let mongo=require("mongoose");
let app=mongo.Schema({
email:{type:String},
name:{type:String},
userid:{type:String},
doctorid:{type:String},
doctormail:{type:String},
description:{type:String},
date:{type:String},
time:{type:String},
shareBriefingRecords:{type:Boolean,default:false},
payoutFeePaise:{type:Number,default:0,min:0},
payoutFundingPayment:{type:mongo.Schema.Types.ObjectId,ref:"payment",select:false},
payoutCompletedAt:Date,
payoutDeclinedAt:Date,
payoutHeld:{type:Boolean,default:false},
payoutReviewedBy:{type:mongo.Schema.Types.ObjectId,ref:"admin",select:false},
});
app.index({ doctorid: 1, date: 1, time: 1 }, { unique: true });
app.index({ userid: 1 });
app.index({ userid: 1, date: 1 }, { unique: true, partialFilterExpression: { payoutFundingPayment: { $type: "objectId" } } });
app.index({ doctorid: 1, payoutCompletedAt: -1 });
module.exports=mongo.model('appointmentnew',app);
