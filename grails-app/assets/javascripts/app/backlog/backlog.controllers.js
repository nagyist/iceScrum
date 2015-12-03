/*
 * Copyright (c) 2014 Kagilum SAS.
 *
 * This file is part of iceScrum.
 *
 * iceScrum is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 *
 * iceScrum is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with iceScrum.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Authors:
 *
 * Vincent Barrier (vbarrier@kagilum.com)
 * Nicolas Noullet (nnoullet@kagilum.com)
 *
 */
controllers.controller('backlogCtrl', ['$scope', '$state', '$filter', 'StoryService', 'backlogs', 'stories', function($scope, $state, $filter, StoryService, backlogs, stories) {
    $scope.isSelected = function(story) {
        if ($state.params.id) {
            return $state.params.id == story.id;
        } else if ($state.params.listId) {
            return _.contains($state.params.listId.split(','), story.id.toString());
        } else {
            return false;
        }
    };
    $scope.authorizedStory = function(action, story) {
        return StoryService.authorizedStory(action, story);
    };
    $scope.refreshBacklogs = function(stories) {
        _.each($scope.backlogs, function(backlog) {
            $scope.refreshSingleBacklog(backlog, stories);
        });
    };
    $scope.refreshSingleBacklog = function(backlog, stories) {
        var filter = JSON.parse(backlog.filter);
        var filteredStories = $filter('filter')(stories, filter.story, function(expected, actual) {
            return angular.isArray(actual) && actual.indexOf(expected) > -1 || angular.equals(actual, expected);
        });
        backlog.stories = $filter('orderBy')(filteredStories, backlog.orderBy.current.id, backlog.orderBy.reverse);
        backlog.sortable = backlog.orderBy.current.id == 'rank' &&
                           !backlog.orderBy.reverse && StoryService.authorizedStory('rank') &&
                           (backlog.name == 'Backlog' || backlog.name == 'Sandbox'); // TODO fix
    };
    $scope.manageShownBacklog = function(backlog) {
        if (backlog.shown && $scope.backlogs.length > 1) {
            backlog.shown = null;
            _.remove($scope.backlogs, {id: backlog.id});
        } else if (!backlog.shown) {
            backlog.storiesRendered = false;
            backlog.orderBy = {
                values: [
                    {id: 'effort', name: $scope.message('todo.is.ui.sort.effort')},
                    {id: 'rank', name: $scope.message('todo.is.ui.sort.rank')},
                    {id: 'name', name: $scope.message('todo.is.ui.sort.name')},
                    {id: 'tasks_count', name: $scope.message('todo.is.ui.sort.tasks')},
                    {id: 'suggestedDate', name: $scope.message('todo.is.ui.sort.date')},
                    {id: 'feature.id', name: $scope.message('todo.is.ui.sort.feature')},
                    {id: 'value', name: $scope.message('todo.is.ui.sort.value')},
                    {id: 'type', name: $scope.message('todo.is.ui.sort.type')}
                ]
            };
            var tmpBacklogs = _.sortByOrder($scope.backlogs, 'shown', 'desc');
            var lastShown = _.first(tmpBacklogs);
            backlog.shown = lastShown ? (lastShown.shown + 1) : 1;
            StoryService.listByBacklog(backlog).then(function(stories) {
                backlog.stories = stories;
                $scope.orderBacklogByRank(backlog); // Initialize order {current, reverse, status}, sortable and refresh the backlog
            });
            if ($scope.backlogs.length == $scope.maxParallelsBacklogs) {
                var removedBacklog = tmpBacklogs.pop();
                removedBacklog.shown = null;
            }
            tmpBacklogs.push(backlog);
            $scope.backlogs = _.sortBy(tmpBacklogs, 'id');
        }
    };
    $scope.orderBacklogByRank = function(backlog) {
        backlog.orderBy.reverse = false;
        $scope.changeBacklogOrder(backlog, _.find(backlog.orderBy.values, {id: 'rank'}));
    };
    $scope.changeBacklogOrder = function(backlog, order) {
        backlog.orderBy.current = order;
        backlog.orderBy.status = false;
        $scope.refreshSingleBacklog(backlog, backlog.stories);
    };
    $scope.reverseBacklogOrder = function(backlog) {
        backlog.orderBy.reverse = !backlog.orderBy.reverse;
        $scope.refreshSingleBacklog(backlog, backlog.stories);
    };
    // Init
    $scope.viewName = 'backlog';
    var updateRank = function(event) {
        var story = event.source.itemScope.modelValue;
        var newStories = event.dest.sortableScope.modelValue;
        var newRank = event.dest.index + 1;
        StoryService.updateRank(story, newRank, newStories);
    };
    $scope.backlogSortable = {
        itemMoved: updateRank,
        orderChanged: updateRank
    };
    $scope.backlogs = [];
    $scope.maxParallelsBacklogs = 2;
    $scope.availableBacklogs = backlogs;
    $scope.manageShownBacklog(backlogs[0]);
    //Useful to keep stories from update
    $scope.stories = StoryService.list;
    $scope.$watch('stories', $scope.refreshBacklogs, true);
}]);