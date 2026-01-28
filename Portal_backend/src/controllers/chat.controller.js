const { generateStreamToken } = require("../config/stream");

async function getStreamToken(req, res) {
    try {
        const token = generateStreamToken(req.body.user._id);
        res.status(200).json({ token });
    } catch (err) {
        console.error("Error generating token:", err);
        res.status(500).json({ message: "Failed to generate token" });
    }
}
module.exports = {
    getStreamToken,
};