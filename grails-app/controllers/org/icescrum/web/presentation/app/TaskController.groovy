/*
 * Copyright (c) 2011 Kagilum.
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
package org.icescrum.web.presentation.app

import grails.converters.JSON
import grails.plugin.springsecurity.annotation.Secured
import org.icescrum.core.domain.*
import org.icescrum.core.utils.BundleUtils

class TaskController {

    def securityService
    def springSecurityService
    def taskService

    @Secured('inProduct() or (isAuthenticated() and stakeHolder())')
    def index() {
        Sprint sprint = (Sprint) params.sprint ? Sprint.getInProduct(params.product.toLong(), params.sprint.toLong()).list() : Sprint.findCurrentOrNextSprint(params.product.toLong()).list()[0]
        if (!sprint) {
            returnError(text: message(code: 'is.sprint.error.not.exist'))
            return
        }
        def tasks = null
        if (params.filter == 'user') {
            tasks = Task.getUserTasks(sprint.id, springSecurityService.principal.id).list()
        } else if (params.filter == 'free') {
            tasks = Task.getFreeTasks(sprint.id).list()
        } else if (params.filter) {
            render(status: 400)
            return
        } else {
            tasks = Task.getAllTasksInSprint(sprint.id).list()
        }
        withFormat {
            html { render status: 200, contentType: 'application/json', text: tasks as JSON }
            json { renderRESTJSON(text: tasks) }
            xml { renderRESTXML(text: tasks) }
        }
    }

    @Secured('inProduct() or (isAuthenticated() and stakeHolder())')
    def show() {
        def id = params.uid?.toInteger() ?: params.id?.toLong() ?: null
        withTask(id, params.uid ? true : false) { Task task ->
            def product = task.parentProduct
            def user = springSecurityService.currentUser
            if (product.preferences.hidden && !user) {
                redirect(controller: 'login', params: [ref: "p/${product.pkey}#task/$task.id"])
                return
            } else if (product.preferences.hidden && !securityService.inProduct(product, springSecurityService.authentication) && !securityService.stakeHolder(product, springSecurityService.authentication, false)) {
                render(status: 403)
                return
            } else {
                withFormat {
                    json { renderRESTJSON(text: task) }
                    xml { renderRESTXML(text: task) }
                    html {
                        def permalink = createLink(absolute: true, mapping: "shortURLTASK", params: [product: product.pkey], id: task.uid)
                        render(view: 'window/details', model: [
                                task        : task,
                                permalink   : permalink,
                                taskStateCode: BundleUtils.taskStates[task.state],
                                taskTypeCode: BundleUtils.taskTypes[task.type]
                        ])
                    }
                }
            }
        }
    }

    @Secured('inProduct() and !archivedProduct()')
    def save() {
        def taskParams = params.task
        if (!taskParams) {
            returnError(text: message(code: 'todo.is.ui.no.data'))
            return
        }
        if (taskParams?.estimation instanceof String) {
            try {
                taskParams.estimation = taskParams.estimation in ['?', ""] ? null : taskParams.estimation.replace(/,/, '.').toFloat()
            } catch (NumberFormatException e) {
                returnError(text: message(code: 'is.task.error.estimation.number'))
                return
            }
        }
        if (!taskParams.backlog) {
            taskParams.backlog = taskParams.sprint
        }
        Task task = new Task()
        try {
            Task.withTransaction {
                bindData(task, taskParams, [include: ['name', 'estimation', 'description', 'notes', 'color', 'parentStory', 'type', 'backlog', 'blocked']])
                taskService.save(task, springSecurityService.currentUser)
                task.tags = taskParams.tags instanceof String ? taskParams.tags.split(',') : (taskParams.tags instanceof String[] || taskParams.tags instanceof List) ? taskParams.tags : null
            }
            withFormat {
                html { render(status: 200, contentType: 'application/json', text: task as JSON) }
                json { renderRESTJSON(status: 201, text: task) }
                xml { renderRESTXML(status: 201, text: task) }
            }
        } catch (IllegalStateException e) {
            returnError(exception: e)
        } catch (RuntimeException e) {
            returnError(object: task, exception: e)
        }
    }

    @Secured('inProduct() and !archivedProduct()')
    def update() {
        def taskParams = params.task
        if (!taskParams) {
            returnError(text: message(code: 'todo.is.ui.no.data'))
            return
        }
        withTask { Task task ->
            User user = (User) springSecurityService.currentUser
            if (taskParams.estimation instanceof String) {
                try {
                    taskParams.estimation = taskParams.estimation in ['?', ""] ? null : taskParams.estimation.replace(/,/, '.').toFloat()
                } catch (NumberFormatException e) {
                    returnError(text: message(code: 'is.task.error.estimation.number'))
                    return
                }
            }
            if (!taskParams.backlog) {
                taskParams.backlog = taskParams.sprint
            }
            def props = [:]
            Integer rank = taskParams.rank instanceof String ? taskParams.rank.toInteger() : taskParams.rank
            if (rank != null) {
                props.rank = rank
            }
            Integer state = taskParams.state instanceof String ? taskParams.state.toInteger() : taskParams.state
            if (state != null) {
                props.state = state
            }
            Task.withTransaction {
                bindData(task, taskParams, [include: ['name', 'estimation', 'description', 'notes', 'color', 'parentStory', 'type', 'backlog', 'blocked']])
                taskService.update(task, user, false, props)
                task.tags = taskParams.tags instanceof String ? taskParams.tags.split(',') : (taskParams.tags instanceof String[] || taskParams.tags instanceof List) ? taskParams.tags : null
                withFormat {
                    html { render(status: 200, contentType: 'application/json', text: task as JSON) }
                    json { renderRESTJSON(text: task) }
                    xml { renderRESTXML(text: task) }
                }
            }
        }
    }

    @Secured('inProduct() and !archivedProduct()')
    def delete() {
        withTasks { List<Task> tasks ->
            User user = (User) springSecurityService.currentUser
            def idj = []
            Task.withTransaction {
                tasks.each {
                    idj << [id: it.id]
                    taskService.delete(it, user)
                }
            }
            withFormat {
                html { render(status: 200) }
                json { render(status: 204) }
                xml { render(status: 204) }
            }
        }
    }

    @Secured('inProduct() and !archivedProduct()')
    def take() {
        withTask { Task task ->
            User user = (User) springSecurityService.currentUser
            Task.withTransaction {
                task.responsible = user
                taskService.update(task, user)
            }
            withFormat {
                html { render(status: 200, contentType: 'application/json', text: task as JSON) }
                json { renderRESTJSON(text: task) }
                xml { renderRESTXML(text: task) }
            }
        }
    }

    @Secured('inProduct() and !archivedProduct()')
    def unassign() {
        withTask { Task task ->
            User user = (User) springSecurityService.currentUser
            if (task.responsible?.id != user.id) {
                returnError(text: message(code: 'is.task.error.unassign.not.responsible'))
                return
            }
            if (task.state == Task.STATE_DONE) {
                returnError(text: message(code: 'is.task.error.done'))
                return
            }
            Task.withTransaction {
                task.responsible = null
                task.state = Task.STATE_WAIT
                taskService.update(task, user)
            }
            withFormat {
                html { render(status: 200, contentType: 'application/json', text: task as JSON) }
                json { renderRESTJSON(text: task) }
                xml { renderRESTXML(text: task) }
            }
        }
    }

    @Secured('inProduct() and !archivedProduct()')
    def copy() {
        withTask { Task task ->
            User user = (User) springSecurityService.currentUser
            def copiedTask = taskService.copy(task, user)
            withFormat {
                html { render(status: 200, contentType: 'application/json', text: copiedTask as JSON) }
                json { renderRESTJSON(text: copiedTask, status: 201) }
                xml { renderRESTXML(text: copiedTask, status: 201) }
            }
        }
    }

    @Secured('inProduct() and !archivedProduct()')
    def attachments() {
        withTask { task ->
            manageAttachmentsNew(task)
        }
    }

    @Secured('inProduct() or (isAuthenticated() and stakeHolder())')
    def listByType(long id, long product, String type) {
        def tasks
        if (type == 'story') {
            tasks = Story.withStory(product, id).tasks
        } else if (type == 'sprint') {
            tasks = Sprint.withSprint(product, id).tasks
        }
        withFormat {
            html { render(status: 200, contentType: 'application/json', text: tasks as JSON) }
            json { renderRESTJSON(text: tasks) }
            xml { renderRESTXML(text: tasks) }
        }
    }

    @Secured('isAuthenticated()')
    def listByUser(Long product) {
        def user = springSecurityService.currentUser
        def options = [max: 8]
        def taskStates = [Task.STATE_WAIT, Task.STATE_BUSY]
        def userTasks = product != null ? Task.findAllByResponsibleAndParentProductAndStateInList(user, Product.get(product), taskStates, options)
                                        : Task.findAllByResponsibleAndStateInListAndCreationDateBetween(user, taskStates, new Date() - 10, new Date(), options)
        def tasksByProject = userTasks.groupBy {
            it.parentProduct
        }.collect { project, tasks ->
            [project: project, tasks: tasks]
        }
        render(status: 200, contentType: 'application/json', text: tasksByProject as JSON)
    }

    @Secured('inProduct() or (isAuthenticated() and stakeHolder())')
    def shortURL(long product, long id) {
        Product _product = Product.withProduct(product)
        if (!springSecurityService.isLoggedIn() && _product.preferences.hidden) {
            redirect(url: createLink(controller: 'login', action: 'auth') + '?ref=' + is.createScrumLink(controller: 'task', params: [uid: id]))
            return
        }
        redirect(url: is.createScrumLink(controller: 'task', params: [uid: id]))
    }
}