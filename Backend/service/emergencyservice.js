const User = require("../model/user");

const MAX_CONTACTS = 5;

function cleanPhone(phone) {
  if (!phone) {
    return null;
  }

  let digits = "";
  for (const ch of String(phone)) {
    if (ch >= "0" && ch <= "9") {
      digits = digits + ch;
    }
  }

  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return "91" + digits;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  return null;
}



function getContactList(user) {
  if (user.emergencyContacts && user.emergencyContacts.length > 0) {
    const list = [];
    for (const contact of user.emergencyContacts) {
      list.push({
        _id: contact._id,
        name: contact.name,
        phone: contact.phone,
        relation: contact.relation,
      });
    }
    return list;
  }

  const oldPhone = cleanPhone(user.emergencyContactNumber);
  if (user.emergencyContactName && oldPhone) {
    return [
      {
        name: user.emergencyContactName,
        phone: oldPhone,
        relation: user.emergencyRelation || null,
      },
    ];
  }

  return [];
}



exports.getEmergencyContacts = async (req, res) => {
  const user = req.user;

  return res.status(200).json({
    success: true,
    name: user.name,
    contacts: getContactList(user),
  });
};



exports.saveEmergencyContacts = async (req, res) => {
  const user = req.user;
  const contactsFromBody = req.body.contacts;

  if (!Array.isArray(contactsFromBody)) {
    return res.status(400).json({ success: false, msg: "contacts must be a list" });
  }

  if (contactsFromBody.length > MAX_CONTACTS) {
    return res.status(400).json({ success: false, msg: "You can add up to " + MAX_CONTACTS + " contacts" });
  }

  const newContacts = [];

  for (const contact of contactsFromBody) {
    const name = String(contact.name || "").trim();
    const phone = cleanPhone(contact.phone);
    const relation = String(contact.relation || "").trim();

    if (name === "") {
      return res.status(400).json({ success: false, msg: "Every contact needs a name" });
    }

    if (phone === null) {
      return res.status(400).json({ success: false, msg: "Invalid phone number for " + name });
    }

    newContacts.push({
      name: name,
      phone: phone,
      relation: relation === "" ? null : relation,
    });
  }

  user.emergencyContacts = newContacts;

  // Save only the contacts field. user.save() would check the whole profile,
  // so an old bad value somewhere else (like maritalStatus: "") would stop this save.
  try {
    await User.updateOne({ _id: user._id }, { $set: { emergencyContacts: user.emergencyContacts } });
  } catch (err) {
    console.log("Saving emergency contacts failed:", err.message);
    return res.status(500).json({ success: false, msg: "Couldn't save contacts. Please try again." });
  }

  return res.status(200).json({
    success: true,
    msg: "Emergency contacts saved",
    contacts: getContactList(user),
  });
};
