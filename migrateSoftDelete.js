/**
 * Migration Script: Add deletedAt field to all existing records
 * 
 * This script adds deletedAt: null to all records in collections
 * that don't already have this field, enabling soft delete functionality.
 * 
 * Run with: node migrateSoftDelete.js
 */

require('dotenv').config({ path: '.env.development' });
const mongoose = require('mongoose');

// Import all models
const User = require('./models/userModel');
const Team = require('./models/teamModel');
const Project = require('./models/projectModel');
const PM = require('./models/PMModel');
const Att = require('./models/AttModel');
const Media = require('./models/MediaModel');

const models = [
    { name: 'User', model: User },
    { name: 'Team', model: Team },
    { name: 'Project', model: Project },
    { name: 'PM', model: PM },
    { name: 'Attendance', model: Att },
    { name: 'Media', model: Media },
];

async function migrate() {
    try {
        // Connect to MongoDB
        const mongoURL = process.env.MONGO_URL;
        if (!mongoURL) throw new Error('MONGO_URL not found in environment');

        await mongoose.connect(mongoURL);
        console.log('✅ Connected to database');

        // Update each model
        for (const { name, model } of models) {
            console.log(`\n📝 Migrating ${name}...`);

            // Count records without deletedAt field
            const countBefore = await model.countDocuments({
                deletedAt: { $exists: false }
            });

            if (countBefore === 0) {
                console.log(`   ✓ ${name}: No records need migration`);
                continue;
            }

            // Add deletedAt: null to all records that don't have it
            const result = await model.updateMany(
                { deletedAt: { $exists: false } },
                { $set: { deletedAt: null } }
            );

            console.log(`   ✓ ${name}: Updated ${result.modifiedCount} records`);
        }

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('📤 Disconnected from database');
    }
}

migrate();
