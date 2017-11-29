app.factory('localDB', function () {
    var crud = {};
    var db = window.openDatabase('localDB', '1.0', 'APP DB', 10 * 1024 * 1024);
    var _select = '';
    var _where = '';
    var _table = '';
    var _delete = '';
    var _update = '';
    var _insert = '';

    /**
     * table method
     * @param tableName
     * @return {{object}}
     */
    crud.table = function (tableName) {
        _table = tableName;
        return crud;
    };

    /**
     * select method
     * @param fields
     * @return {{object}}
     */
    crud.select = function (fields) {
        if (fields.constructor === 'Array') {
            fields = fields.join(',');
        }
        _select = ' SELECT ' + fields + ' FROM {{table}} ';
        return crud;
    };

    /**
     * where method
     * @param field
     * @param symbol
     * @param value
     * @return {{object}}
     */
    crud.where = function (field, symbol, value) {
        if (_where.trim() === '') {
            _where = ' WHERE ';
        } else {
            _where += ' AND ';
        }

        if (!Number.isInteger(value)) {
            value = "'" + value + "'";
        }

        _where += '`' + field + '`' + symbol + value;
        return crud;
    };

    /**
     * delete method
     * @return {{object}}
     */
    crud.delete = function () {
        _delete = ' DELETE FROM {{table}}';
        return crud;
    };

    /**
     * update method
     * @param values
     */
    crud.update = function (values) {
        _update = ' UPDATE {{table}} SET ';

        for (var v in values) {
            _update += " `" + v + "` = '" + values[v] + "',";

        }

        _update = _update.replace(/,\s*$/, "");

        return crud;
    };

    /**
     * orWhere method
     * @param field
     * @param symbol
     * @param value
     * @return {{object}}
     */
    crud.orWhere = function (field, symbol, value) {
        if (_where.trim() === '') {
            _where = ' WHERE ';
        } else {
            _where += ' OR ';
        }
        _where += '`' + field + '`' + symbol + value;
        return crud;
    };

    /**
     * insert method
     * @param values
     * @returns {{object}}
     */
    crud.insert = function (values) {
        _insert = ' INSERT INTO {{table}} (' + Object.keys(values) + ') VALUES (';

        for (var v in values) {
            _insert += "'" + values[v] + "',";
        }

        _insert = _insert.replace(/,\s*$/, "");

        _insert += ')';


        return crud;
    };

    /**
     * query method
     * @param success
     * @param error
     * @param queryString
     */
    crud.query = function (success, error, queryString) {
        var query = queryString
            || _select + _update + _insert + _delete + _where;

        query = query.replace('{{table}}', _table);
        console.info(query);
        execute(query, success, error);
    };

    /**
     * execute method
     * @param queryString
     * @param success
     * @param error
     */
    function execute(queryString, success, error) {
        _table = _select = _where = _delete = _insert = _update = '';
        db.transaction(function (tx) {
            tx.executeSql(queryString, [], success, error);
        });
    }

    return crud;
});