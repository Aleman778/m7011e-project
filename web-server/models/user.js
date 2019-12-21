
/***************************************************************************
 * The user model defines a generic user in the system.
 ***************************************************************************/

const db = require('../db')
const helper = require('./helper');
const uuid = require('uuid/v4');
const md5 = require('md5');

/**
 * The user class is an abstract class
 */
class User {

    /**
     * Creates a new user with the given data.
     * @param {uuid} id the users primary key
     * @param {string} name the name of the user
     * @param {string} email the user email address
     * @param {string} the hashed password (do not store cleartext passwords)
     * @param {string} role the user role in the system
     * @param {date} created at timestamp
     * @param {date} updated at timestamp
     * @param {object} created and updated at timestamps
     */
    constructor(
        name,
        email,
        role,
        created_at=new Date(),
        updated_at=new Date(),
        id=uuid(),
        password=undefined,
        gravatar=true,
        removed=false
    ) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role;
        this.gravatar = gravatar;
        this.removed = removed;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }


    /**
     * Tries to find a user with the given properties e.g.
     * `let user = User.findOne({email: "test@test.com"});`
     * If there are multiple results found then this will be rejected.
     * For retreving many users use the User.findMany method instead.
     * @param {object} where properties to check against.
     * @returns {Promise} resolves to a User if successful otherwise rejects with error.
     */
    static findOne(where) {
        return new Promise((resolve, reject) => {
            (async () => {
                try {
                    let users = await User.findMany(where);
                    if (users.length != 1) {
                        reject("did not find one user but " + users.length + " instead");
                    } else {
                        resolve(users[0]);
                    }
                } catch (err) {
                    reject(err);
                }
            })()
        })
    }

 
    /**
     * Finds all the users with the given properties,
     * set where to {} for selecting all users. E.g.
     * `let user = User.findOne({email: "test@test.com"});`
     * If you only want to accept one user then 
     * Note: removed users are not considered!
     * @param {Arr} where properties to check against.
     * @returns {Promise}  if successful it resolves to an array of User
     *                     objects otherwise rejects with error.
     */
    static findMany(where) {
        return new Promise((resolve, reject) => {
            (async () => {
                var props = [];
                var values = [];
                for (var prop in where) {
                    if (Object.prototype.hasOwnProperty.call(where, prop)) {
                        props.push(prop);
                        values.push(where[prop]);
                    }
                }
                var queryText = "SELECT * FROM users WHERE removed=FALSE";
                if (props.length > 0) {
                    for (var i = 0; i < props.length; i += 1) {
                        queryText += " AND " + props[i] + "=$" + (i + 1);
                    }
                }
                try {
                    var users = []
                    let { rows } = await db.query(queryText, values);
                    rows.forEach(function(row) {
                        users.push(new User(
                            row.name,
                            row.email,
                            row.role,
                            row.created_at,
                            row.updated_at,
                            row.id,
                            row.gravatar,
                            row.password,
                            row.removed
                        ));
                    });
                    resolve(users);
                } catch (err) {
                    reject(err);
                }
            })();
        });
    }
    
    
    /**
     * Stores this user in the database with a password.
     * Note: you do not need to hash it this is done here before insert.
     * @param {string} password in clear text
     * @returns {jwt token} signed token if creation was successful
     */
    store() {
        if (this.removed) {
            throw new Error("cannot store a user that has been removed.");
        }
        if (!this.password) {
            throw new Error("Cannot store a user without a password.");
        }
        
        const queryText = `INSERT INTO users(id, name, email, password, role, gravatar, removed, created_at, updated_at)
                           VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const params = [
            this.id, this.name, this.email, this.password, this.role,
            this.gravatar, this.removed, this.created_at, this.updated_at];
        return db.query(queryText, params);
    }


    /**
     * Updates the specified fields from the user object in the database.
     * Note: updated_at is automatically updated with the current time.
     * @param {array} fields containing strings of each field to include.
     */
    update(fields) {
        if (this.removed) {
            throw new Error("cannot update a user that has been removed");
        }
        var queryText = "UPDATE users SET ";
        var params = [];
        fields.forEach(field => {
            switch(field) {
            case 'name':
                params.push(this.name);
                break;
            case 'email':
                params.push(this.email);
                break;
            case 'password':
                params.push(this.password);
                break;
            case 'role':
                params.push(this.role);
                break;
            case 'gravatar':
                params.push(this.gravatar);
                break;
            case 'removed':
                throw new Error("Use the remove(password) function to remove a user instead.");
            case 'created_at':
                throw new Error("You should not update the `created_at` field.");
            case 'updated_at':
                throw new Error("The field `updated_at` is automatically set, please remove it from the field list.");
            default:
                throw new Error("The field `" + field + "` does not exists in the users table.");
            }
            queryText += field + " = $" + params.length + ", ";
        });

        this.updated_at = new Date();
        params.push(this.updated_at);
        queryText += "updated_at = $" + params.length + " ";

        params.push(this.id);
        queryText += "WHERE id = $" + params.length + " AND removed = FALSE";
        return db.query(queryText, params);
    }
     

    /**
     * Removes a user from the service. The cleartext password is
     * required as a security measure so that a user is not accidentally removed.
     */
    remove(password) {
        if (!this.password) {
            throw new Error("Please specifiy your password in order to remove the user.");
        } else if (comparePassword(password, this.password)) {
            const queryText = `UPDATE users
                SET name = 'Removed', email = $1, password = 'removed',
                role = 'removed', removed=TRUE, updated_at = $2
                WHERE id = $3 AND removed = FALSE`;
            const params = [uuid(), new Date(), this.id];
            db.query(queryText, params);
        } else {
            throw new Error("Your provided password is incorrect.")
        }
    }


    /**
     * Creates a md5 hash of the users email, used for retreving
     * gravatar images.
     * @returns {string} the email hash
     */
    emailHash() {
        return md5(this.email.trim().toLowerCase());
    }
}


module.exports = User;
