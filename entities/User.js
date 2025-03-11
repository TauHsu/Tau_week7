const { EntitySchema } = require('typeorm');
const { password } = require('../config/db');

module.exports = new EntitySchema({
    name: 'User',
    tableName: 'USER',
    columns: {
        id: {
            primary: true,
            type: 'uuid',
            generated: 'uuid',
            nullable: false
        },
        name: {
            type: 'varchar',
            length: 50,
            nullable: false
        },
        email: {
            type: 'varchar',
            length: 320,
            unique: true,
            nullable: false
        },
        role: {
            type: 'varchar',
            length: 20,
            nullable: false
        },
        password: {
            type: 'varchar',
            length: 72,
            select: false,
            nullable: false
        },
        created_at: {
            type: 'timestamp',
            createDate: true,
            nullable: false
        },
        updated_at:{
            type: 'timestamp',
            updateDate: true,
            nullable: false
        }
    }
});