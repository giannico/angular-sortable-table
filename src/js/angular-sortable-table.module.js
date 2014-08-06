(function() { 'use strict';

/**
 * @ngdoc overview
 * @name sortableTable
 *
 * @description
 * The `sortableTable` module provides support for sorting HTML tables.
 *
 * # Usage
 * The `sortableTable` directive enables sorting on HTML tables.
 *
 * ``` html
 * <table sortable-table>
 *   <thead>
 *     <tr>
 *       <th sortable-header="title" sort-default="desc"></th>
 *       <th sortable-header="episodeCount"></th>
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr ng-repeat="show in shows">
 *       <td>{{show.title}}</td>
 *       <td>{{show.episodeCount}}</td>
 *       <td>{{show.originalAirDate}}</td>
 *     </tr>
 *   </tbody>
 * </table>
 * ```
 */

/////////////////////////////////////////////////
/// AngularJS module interface
/////////////////////////////////////////////////

angular.module('ag.sortableTable', []).
    value('SortableField', SortableField).
    controller('SortableTableCtrl', SortableTableCtrl).
    directive('sortableTable', sortableTableDirective).
    directive('sortableHeader', sortableHeaderDirective);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @ngdoc object
 * @class
 *
 * @description
 * Value object used to contain the state of a sortable field (column in a table).
 *
 * @param {string} sortExpression - A string or function to be used to sort the column.
 *                                  This accepts the name of a field, or the name of a function to
 *                                  be used with the native AngularJS `orderBy` directive.
 */
function SortableField(sortExpression) {
    this.sortExpression = sortExpression;
    this.isActive = false;
    this.isDescending = false;

    this.activate = function() {
        this.isActive = true;
    };

    // Always reset field to descending when deactivating
    this.deactivate = function() {
        this.isDescending = false;
        this.isActive = false;
    };

    this.setAscending = function() {
        this.isDescending = false;
    };

    this.setDescending = function() {
        this.isDescending = true;
    };

    this.toggleSort = function() {
        this.isDescending = !this.isDescending;
    };
}

/**
 * @ngdoc object
 * @name SortableTableController
 *
 * @description
 * `SortableTableController` keeps track of the state of the sortable table. It provides
 * functionality to set/get the field that's being sorted, and to set/get the direction of
 * the sort.
 *
 * Each `sortableTable` directive creates an instance of `SortableTableController`.
 */
function SortableTableCtrl($scope, $attrs) {
    var that = this;

    this.activeSortField = null;

    this.setActiveSortField = function(sortField) {
        if (this.activeSortField === sortField) {
            this.activeSortField.toggleSort();
        } else {
            // if a previous sort field exists, deactivate it
            if (this.activeSortField != null) {
                this.activeSortField.deactivate();
            }

            this.activeSortField = sortField;
            this.activeSortField.activate();
        }
    };

    $scope.getSortExpression = function() {
        if (that.activeSortField == null) {
            return null;
        } else {
            return that.activeSortField.sortExpression;
        }
    };

    $scope.isSortDescending = function() {
        if (that.activeSortField == null) {
            return null;
        } else {
            return that.activeSortField.isDescending;
        }
    };

}

SortableTableCtrl.$inject = ['$scope', '$attrs'];

/**
 * @ngdoc directive
 * @name sortableTable
 * @restrict A
 *
 * @description
 * Directive that instantiates `SortableTableCtrl` and enriches HTML tables with functionality
 * for sorting.
 *
 * # CSS classes (added to the <table> element)
 *  - `sortable-table` is set to identify sortable tables.
 */
function sortableTableDirective($compile) {
    return {
        restrict: 'A',
        controller: 'SortableTableCtrl',
        compile: function(tElement, tAttrs) {

            /////////////////////////////////////////////////
            /// Helper Functions
            /////////////////////////////////////////////////

            /**
             * Finds the table row element that's a child of this table, that has the ng-repeat attribute defined.
             *
             * @private {object} tableElement - jqLite wrapped table element
             * @returns {object} jqLite wrapped ng-repeat element.
             */
            var findNgRepeatElement = function(tableElement) {
                var ngRepeatElement = tableElement.find('tr[ng-repeat]');

                if (ngRepeatElement.length === 0) { return null; }

                return ngRepeatElement;
            };

            /**
             * Modifies the provided `ngRepeatElement` to include an Angular `orderBy` directive.
             *
             * @private
             * @param {object} ngRepeatElement - jqLite wrapped ng-repeat element
             * @returns {object}
             */
            var addSortFilter = function(ngRepeatElement) {
                var addedSortExpression = '| orderBy:getSortExpression():isSortDescending()';

                var ngRepeatExpression = ngRepeatElement.attr('ng-repeat');

                // regular expression is used to find the correct place to "inject" the
                // angular `orderBy` filter (between the 'row in rows' and 'track by' tokens)
                var ngRepeatRegEx = /^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(\s+track\s+by\s+[\s\S]+?)?\s*$/;

                // update the regular expression to include the `orderBy` filter.
                var updatedNgRepeatExpression = ngRepeatExpression.replace(ngRepeatRegEx,
                        '$1 in $2 ' + addedSortExpression + ' $3');

                ngRepeatElement.attr('ng-repeat', updatedNgRepeatExpression);

                return ngRepeatElement;
            };

            /////////////////////////////////////////////////
            /// The directive's compile logic
            /////////////////////////////////////////////////
            var ngRepeatElement = findNgRepeatElement(tElement);

            if (ngRepeatElement == null) {
                throw new Error('sortable-table should have a tr element with ng-repeat defined.');
            }

            addSortFilter(ngRepeatElement);

            return {
                pre: function preLink(scope, iElement, iAttrs, controller) {},
                post: function postLink(scope, iElement, iAttrs, controller) {}
            };
        }
    };
}

sortableTableDirective.$inject = ['$compile'];

/**
 * @ngdoc directive
 * @name sortableHeader
 * @restrict A
 * @scope
 *
 * @description
 * Directive that defines the sortable columns in a `sortableTable` `SortableTableCtrl` and
 * enriches HTML tables with functionality for sorting.
 *
 * # CSS classes (on the `<th>` elements)
 *  - `sort-active` is set if the column is being sorted.
 *  - `sort-asc` is set if the column is being sorted ascendingly.
 *  - `sort-desc` is set if the column is being sorted descendingly.
 *
 * *Note:* this must be used in conjuction with the `sortableTable` directive.
 **/
function sortableHeaderDirective(SortableField) {
    return {
        restrict: 'A',
        replace: true,
        transclude: true,
        scope: {
            sortExpression: '@sortableHeader',
            sortDefault: '@sortDefault'
        },
        template:
          '<th class="sortable-table-header" ng-class="{ ' +
              '\'sort-asc\':    !sortField.isDescending,           ' +
              '\'sort-desc\':   sortField.isDescending,            ' +
              '\'sort-active\': sortField.isActive,                ' +
            '}",                                                 ' +
            'ng-click="activateSort(sortField)"                  ' +
            'ng-transclude>                                      ' +
          '</th>',
        require: '^sortableTable',
        link: function(scope, element, attrs, sortableTableCtrl) {

            // Create a value object to represent the sortable column
            // Initially set to inactive and state, and ascending sort.
            scope.sortField = new SortableField(scope.sortExpression, false, false);

            scope.activateSort = function(sortField) {
                sortableTableCtrl.setActiveSortField(sortField);
            };

            if (scope.sortDefault != null) {
                // sort fields are ascending by default, so we'll only handle the
                // descending case and assume ascending otherwise.
                if (scope.sortDefault === 'desc' || scope.sortDefault === 'descending') {
                    scope.sortField.setDescending();
                }

                scope.activateSort(scope.sortField);
            }
        }
    };
}

sortableTableDirective.$inject = ['SortableField'];

})();