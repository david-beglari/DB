/**
 * DB object created to work with SQLite database
 * @author Varazdat Stepanyan
 *
 * @usage
 * Create table example -> db.query('CREATE TABLE IF NOT EXISTS test (_id INTEGER PRIMARY KEY, name TEXT)').then(resolve,reject)
 * CREATE db.insert({name:'First Insert'}).table('test').query().then(resolve,reject)
 * READ db.select(['_id','name']).table('test').query().then(resolve,reject)
 * UPDATE db.table('test').update({name:'First Update'}).query().then(resolve,reject)
 * DELETE db.table('test').delete().where('_id', '=', 3).query().then(resolve,reject)
 *
 */
var DB = (function () {
    'use strict';

    /**
     *
     * @type {{}}
     */
    DB.SQLite = null;
    /**
     *
     * @type {number}
     */
    DB.affectedRows = 0;
    /**
     *
     * @type {Array}
     */
    DB.rows = [];
    /**
     *
     * @type {boolean}
     * @private
     */
    var _emptyQuery = true;
    /**
     * @type {DB}
     */
    var _self;
    /**
     *
     * @type {string}
     * @private
     */
    var _table = '';
    /**
     *
     * @type {string}
     * @private
     */
    var _crud = '';
    /**
     *
     * @type {string}
     * @private
     */
    var _where = '';
    /**
     *
     * @type {string}
     * @private
     */
    var _limit = '';

    /**
     *
     * @param {string} name
     * @param {number} size
     * @constructor
     */
    function DB(name, size) {
        _self = this;
        if (!DB.SQLite) {
            DB.SQLite = window.openDatabase(name, '1.0', name.toUpperCase() + ' DB', size);
        }
    }

    /**
     *
     * Bulk insert
     * TODO need to be approved?
     *
     * @return {*}
     * @param data
     */
    DB.prototype.insertBulk = function (data) {

        // do not delete query string during bulk insert
        _emptyQuery = false;

        // create static property counter
        if(typeof DB.counter === 'undefined'){
            DB.counter = 0;
        }

        // if no more data to insert return true
        if(typeof data[DB.counter] === 'undefined'){

            // set empty query to true
            _emptyQuery = true;
            return true;
        }

        // call DB insert method
        this.insert(data[DB.counter]).query().then(
            function (db) {},
            // if for some reason insert fails then stop recursion
            function (error) {
                DB.counter = -1;
            }
        );

        // add static counter by one
        DB.counter++;

        // make recursion
        this.insertBulk(data);
    };

    /**
     *
     * @return {Number}
     */
    DB.prototype.rowCount = function () {
        return DB.rows.length;
    };

    /**
     *
     * @return {Array}
     */
    DB.prototype.fetchAll = function () {
        return DB.rows;
    };

    /**
     *
     * @return {number|*}
     */
    DB.prototype.lastInsertId = function () {
        return DB.insertId;
    };

    /**
     *
     * @return {number|*}
     */
    DB.prototype.getAffectedRows = function () {
        return DB.affectedRows;
    };

    /**
     *
     * @return {*}
     */
    DB.prototype.fetch = function () {
        if (DB.rows.length > 0) {
            return DB.rows[0];
        }
        return null;
    };

    /**
     *
     * @param {number} limit
     * @param {number} offset
     * @return {DB}
     */
    DB.prototype.limit = function (limit, offset) {
        _limit = 'LIMIT ' + limit;
        if(typeof offset !== 'undefined'){
            _limit += ','+offset;
        }
        return this;
    };

    /**
     *
     * @param {string|Array} fields
     * @return {DB}
     */
    DB.prototype.select = function (fields) {

        if (typeof fields === 'undefined') {
            fields = '*';
        } else if (fields.constructor === 'Array') {
            fields.map(function (field) {
                return '`' + field + '`';
            });
        }

        _crud = 'SELECT ' + fields + ' FROM {{table}} ';

        return this;
    };

    /**
     *
     * @param {string} tableName
     * @return {DB}
     */
    DB.prototype.table = function (tableName) {
        _table = tableName;
        return this;
    };

    /**
     *
     * @param {{}} values
     */
    DB.prototype.insert = function (values) {
        // get fields as object keys
        var fields = Object.keys(values);
        // will store sql escaped field names
        var escapedFields = [];
        // loop fields and push escaped field to escaped fields list
        fields.map(function (field) {
            escapedFields.push('`' + field + '`');
        });

        _crud = 'INSERT INTO {{table}} (' + escapedFields.join(',') + ') VALUES (';

        for (var k in values) {
            _crud += "'" + values[k] + "', ";
        }

        _crud = _crud.replace(/,\s*$/, "");
        _crud += ') ';

        return this;
    };

    /**
     *
     * Use with where only
     *
     * @param {{}} values
     * @return {DB}
     */
    DB.prototype.update = function (values) {

        _crud = 'UPDATE {{table}} SET ';

        for (var k in values) {
            if (Number.isInteger(values[k])) {
                _crud += '`' + k + '` = ' + values[k];
            } else {
                _crud += '`' + k + '` = ' + "'" + values[k] + "'";
            }
        }

        return this;
    };

    /**
     * Use with where only
     *
     * @return {DB}
     */
    DB.prototype.delete = function () {
        _crud = 'DELETE FROM {{table}} ';
        return this;
    };

    /**
     *
     * @param {string} field
     * @param {string} operator
     * @param {string|number} value
     * @return {DB}
     */
    DB.prototype.where = function (field, operator, value) {
        if (_where.trim() === '') {
            _where = 'WHERE ';
        } else {
            _where += ' AND ';
        }

        if (!Number.isInteger(value)) {
            value = "'" + value + "'";
        }

        _where += field + ' ' + operator + ' ' + value;

        return this;
    };

    /**
     *
     * @param {string} field
     * @param {string} operator
     * @param {string|number} value
     * @return {DB}
     */
    DB.prototype.orWhere = function (field, operator, value) {
        if (_where.trim() === '') {
            _where = 'WHERE ';
        } else {
            _where += ' OR ';
        }

        if (!Number.isInteger(value)) {
            value = "'" + value + "'";
        }

        _where += field + ' ' + operator + ' ' + value;

        return this;
    };

    /**
     *
     * @param {string} field
     * @param {Array} values
     * @return {DB}
     */
    DB.prototype.whereIn = function (field, values) {
        if (_where.trim() === '') {
            _where = 'WHERE ';
        } else {
            _where += ' AND ';
        }

        values.map(function (v) {
            return Number.isInteger(v) ? v : "'" + v + "'";
        });

        _where += field + ' IN(' + values.join(',') + ')';

        return this;
    };

    /**
     *
     * @param {string} queryString
     * @return {Promise}
     */
    DB.prototype.query = function (queryString) {
        if (typeof queryString === 'undefined') {
            queryString = _crud + ' ' + _where + _limit;
            queryString = queryString.replace('{{table}}', _table);
        }
        if(_emptyQuery){
            _crud = _table = _where = _limit = '';
        }
        console.log(queryString);
        return _execute(queryString);
    };

    /**
     *
     * @param {string} queryString
     * @return {Promise}
     * @private
     */
    function _execute(queryString) {
        return new Promise(function (resolve, reject) {
            DB.SQLite.transaction(function (tx) {
                tx.executeSql(queryString, [], function (tx, r) {
                    DB.rows = r.rows;
                    DB.affectedRows = r.rowsAffected;
                    try {
                        DB.insertId = r.insertId;
                    } catch (e) {}
                    resolve(_self);
                }, function (err) {
                    reject(err);
                });
            });
        });
    }

    return DB;
})();