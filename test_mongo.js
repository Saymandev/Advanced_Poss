const { Types } = require('mongoose');
const id = new Types.ObjectId();
try {
  const newId = new Types.ObjectId(id);
  console.log("Success:", newId.toString() === id.toString());
} catch(e) {
  console.log("Error:", e.message);
}
