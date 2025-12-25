import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const SocialSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    iconName: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
});

// Use 'Social' model name to match existing collection
const Social = mongoose.models.Social || mongoose.model('Social', SocialSchema);

async function manageSocials() {
    console.log('Connecting to DB...');
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is missing in .env');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const toHide = ['Email', 'Coffee', 'Instagram'];

    for (const name of toHide) {
        // Case insensitive regex match for name
        const res = await Social.updateMany(
            { name: { $regex: new RegExp(name, 'i') } },
            { $set: { isHidden: true } }
        );
        console.log(`Hidden ${name}: ${res.modifiedCount} updated.`);
        // Verify
        const updated = await Social.find({ name: { $regex: new RegExp(name, 'i') } });
        updated.forEach(s => console.log(`  - ${s.name} is now hidden: ${s.isHidden}`));
    }

    await mongoose.disconnect();
    console.log('Done.');
}

manageSocials().catch(console.error);
