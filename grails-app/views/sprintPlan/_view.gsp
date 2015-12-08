%{--
- Copyright (c) 2015 Kagilum SAS
-
- This file is part of iceScrum.
-
- iceScrum is free software: you can redistribute it and/or modify
- it under the terms of the GNU Affero General Public License as published by
- the Free Software Foundation, either version 3 of the License.
-
- iceScrum is distributed in the hope that it will be useful,
- but WITHOUT ANY WARRANTY; without even the implied warranty of
- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
- GNU General Public License for more details.
-
- You should have received a copy of the GNU Affero General Public License
- along with iceScrum.  If not, see <http://www.gnu.org/licenses/>.
-
- Authors:
-
- Vincent Barrier (vbarrier@kagilum.com)
- Nicolas Noullet (nnoullet@kagilum.com)
--}%

<div class="panel panel-light">
    <div class="panel-heading">
        <h3 class="panel-title">
            <a href ng-click="openSprint()">
                {{ sprint.parentRelease.name }} {{ sprint.orderNumber }}
            </a>
            <div class="btn-group pull-right visible-on-hover">
                <g:if test="${params?.printable}">
                    <button type="button"
                            class="btn btn-default"
                            uib-tooltip="${message(code:'is.ui.window.print')} (P)"
                            tooltip-append-to-body="true"
                            tooltip-placement="bottom"
                            ng-click="print($event)"
                            ng-href="{{ ::viewName }}/print"
                            hotkey="{'P': hotkeyClick }"><span class="fa fa-print"></span>
                    </button>
                </g:if>
                <g:if test="${params?.fullScreen}">
                    <button type="button"
                            class="btn btn-default"
                            ng-show="!app.isFullScreen"
                            ng-click="fullScreen()"
                            uib-tooltip="${message(code:'is.ui.window.fullscreen')} (F)"
                            tooltip-append-to-body="true"
                            tooltip-placement="bottom"
                            hotkey="{'F': fullScreen }"><span class="fa fa-expand"></span>
                    </button>
                    <button type="button"
                            class="btn btn-default"
                            ng-show="app.isFullScreen"
                            uib-tooltip="${message(code:'is.ui.window.fullscreen')}"
                            tooltip-append-to-body="true"
                            tooltip-placement="bottom"
                            ng-click="fullScreen()"><span class="fa fa-compress"></span>
                    </button>
                </g:if>
            </div>
        </h3>
    </div>
    <table class="panel-body table grid-group postits sortable-disabled">
        <thead>
            <tr>
                <th style="width:16%; text-align:center;">
                    Type
                </th>
                <th style="width:28%; text-align:center;">
                    <span>${message(code: 'is.task.state.wait')}</span>
                </th>
                <th style="width:28%; text-align:center;">
                    <span>${message(code: 'is.task.state.inprogress')}</span>
                </th>
                <th style="width:28%; text-align:center;">
                    <span>${message(code: 'is.task.state.done')}</span>
                </th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="width:16%">
                    ${message(code: 'is.ui.sprintPlan.kanban.urgentTasks')}
                </td>
                <td style="width:28%"
                    ng-model="tasksByTypeByState[11][taskState]"
                    as-sortable="taskSortableOptions"
                    ng-repeat="taskState in taskStates">
                    <div ng-repeat="task in tasksByTypeByState[11][taskState] | orderBy: 'rank'"
                         as-sortable-item
                         ng-controller="taskCtrl"
                         ellipsis
                         class="postit-container">
                        <div ng-include="'task.html'"></div>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="width:16%">
                    ${message(code: 'is.ui.sprintPlan.kanban.recurrentTasks')}
                </td>
                <td style="width:28%"
                    ng-model="tasksByTypeByState[10][taskState]"
                    as-sortable="taskSortableOptions"
                    ng-repeat="taskState in taskStates">
                    <div ng-repeat="task in tasksByTypeByState[10][taskState] | orderBy: 'rank'"
                         as-sortable-item
                         ng-controller="taskCtrl"
                         ellipsis
                         class="postit-container">
                        <div ng-include="'task.html'"></div>
                    </div>
                </td>
            </tr>
            <tr ng-repeat="story in backlog.stories">
                <td style="width:16%"
                    as-sortable="{}"           %{-- TODO remove hack--}%
                    ng-model="backlog.stories" %{-- TODO remove hack--}%
                    is-disabled="true">        %{-- TODO remove hack--}%
                    <div as-sortable-item %{-- TODO remove hack--}%
                         ellipsis
                         class="postit-container">
                        <div ng-include="'story.html'"></div>
                    </div>
                </td>
                <td style="width:28%"
                    ng-model="tasksByStoryByState[story.id][taskState]"
                    as-sortable="taskSortableOptions"
                    ng-repeat="taskState in taskStates">
                    <div ng-repeat="task in tasksByStoryByState[story.id][taskState] | orderBy: 'rank'"
                         as-sortable-item
                         ng-controller="taskCtrl"
                         ellipsis
                         class="postit-container">
                        <div ng-include="'task.html'"></div>
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
</div>