import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const keys = webpush.generateVAPIDKeys();

console.log("VAPID_PUBLIC_KEY=", keys.publicKey);
console.log("VAPID_PRIVATE_KEY=", keys.privateKey);
