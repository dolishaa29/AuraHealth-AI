let mongo = require("mongoose");

let usermodel = mongo.Schema({
   email: { type: String, unique: true, index: true },
   password: { type: String },
   name: { type: String },
   contact: { type: Number },
   address: { type: String },

   userstatus: {
      type: String,
      default: "unblock",
      enum: ["block", "unblock"]
   },

   gender: {
      type: String,
      default: null,
      enum: ["male", "female", "other"]
   },
   dob: { type: Date, default: null },

   fatherName: { type: String, default: null },
   motherName: { type: String, default: null },

   maritalStatus: {
      type: String,
      default: null,
      enum: ["single", "married", "other", null]
   },

   nationality: { type: String, default: null },

   bloodGroup: {
      type: String,
      default: null,
   },

   emergencyContactName: { type: String, default: null },
   emergencyContactNumber: { type: Number, default: null },
   emergencyRelation: { type: String, default: null },

   emergencyContacts: {
      type: [{
         name: { type: String, required: true, trim: true },
         phone: { type: String, required: true },
         relation: { type: String, default: null, trim: true },
      }],
      default: [],
   },

   image: {
      type: String,
      default: null
   },


   credits: { type: Number, min: 0 },

}, { timestamps: true });

module.exports = mongo.model('user', usermodel);