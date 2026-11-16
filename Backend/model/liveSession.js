let mongo = require("mongoose");

let liveSession = mongo.Schema({
   user: { type: mongo.Schema.Types.ObjectId, ref: "user", required: true, unique: true },
   expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongo.model("liveSession", liveSession);
