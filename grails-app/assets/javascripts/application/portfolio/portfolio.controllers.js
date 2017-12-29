/*
 * Copyright (c) 2017 Kagilum SAS.
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
controllers.controller('abstractPortfolioListCtrl', ['$scope', 'PortfolioService', 'ProjectService', function($scope, PortfolioService, ProjectService) {
    $scope.selectPortfolio = function(portfolio) {
        $scope.portfolio = portfolio;
    };
    // Init
}]);


controllers.controller('abstractPortfolioCtrl', ['$scope', '$uibModal', '$rootScope', '$filter', 'ProjectService', 'PortfolioService', 'UserService', 'Session', function($scope, $uibModal, $rootScope, $filter, ProjectService, PortfolioService, UserService, Session) {
    $scope.preparePortfolio = function(portfolio) {
        var p = angular.copy(portfolio);
        var mapId = function(objects) {
            return _.map(objects, function(object) {
                return object.id ? {id: object.id} : {};
            });
        };
        var invited = function(members) {
            return _.filter(members, function(member) {
                return !member.id
            });
        };
        if (portfolio.projects) {
            p.projects = mapId(portfolio.projects);
        }
        if (portfolio.businessOwners) {
            p.businessOwners = mapId(portfolio.businessOwners);
            p.invitedBusinessOwners = invited(portfolio.businessOwners);
        }
        if (portfolio.stakeHolders) {
            p.stakeHolders = mapId(portfolio.stakeHolders);
            p.invitedstakeHolders = invited(portfolio.stakeHolders);
        }
        return p;
    };
    $scope.searchUsers = function(val) {
        return UserService.search(val, true).then(function(users) {
            return _.chain(users)
                .filter(function(u) {
                    var found = _.find($scope.portfolio.businessOwners, {email: u.email});
                    if (!found) {
                        found = _.find($scope.portfolio.stakeHolders, {email: u.email});
                    }
                    return !found;
                })
                .map(function(member) {
                    member.name = $filter('userFullName')(member);
                    return member;
                })
                .value();
        });
    };
    $scope.addUser = function(user, role) {
        if (role == 'bo') {
            $scope.portfolio.businessOwners.push(user);
            this.bo = "";
        } else if (role == 'sh') {
            $scope.portfolio.stakeHolders.push(user);
            this.sh = "";
        }
    };
    $scope.removeUser = function(user, role) {
        if (role == 'bo') {
            _.remove($scope.portfolio.businessOwners, {email: user.email});
        } else if (role == 'sh') {
            _.remove($scope.portfolio.stakeHolders, {email: user.email});
        }
    };
    $scope.selectProject = function(project) {
        if (project.portfolio) {
            return;
        }
        if (project.id) {
            $scope.portfolio.projects.push(project);
        } else {
            project.pkey = _.upperCase(project.name).replace(/\W+/g, "").substring(0, 10);
            addNewProject(project);
        }
        $scope.formHolder.projectSelection = null;
    };
    var addNewProject = function(project) {
        $uibModal.open({
            keyboard: false,
            backdrop: 'static',
            templateUrl: $rootScope.serverUrl + "/project/add",
            size: 'lg',
            controller: 'newProjectCtrl',
            resolve: {
                manualSave: true,
                lastStepButtonLabel: function() {
                    return $scope.message('is.ui.apps.portfolio.add.project');
                },
                projectTemplate: function() {
                    var template = _.find($scope.portfolio.projects, function(project) { return project.id === undefined; });
                    if (template) {
                        template = angular.copy(template);
                        var templatePreferences = angular.copy(template.preferences);
                        return {
                            name: project ? project.name : '',
                            pkey: project ? project.pkey : '',
                            initialize: template.initialize ? template.initialize : '',
                            startDate: template.startDate,
                            endDate: template.endDate,
                            firstSprint: template.firstSprint,
                            vision: template.vision, //good idea?
                            planningPokerGameType: template.planningPokerGameType,
                            preferences: templatePreferences
                        }
                    } else {
                        return {
                            name: project ? project.name : '',
                            pkey: project ? project.pkey : ''
                        };
                    }
                }
            }
        }).result.then(function(project) {
            if (project) {
                ProjectService.save(project).then(function(project) {
                    project.new = true;
                    $scope.portfolio.projects.push(project);
                });
            }
        });
    };
    $scope.removeProject = function(projectToRemove) {
        if (projectToRemove.new) {
            ProjectService.delete(projectToRemove).then(function() {
                $scope.portfolio.projects = _.pull($scope.portfolio.projects, projectToRemove);
            });
        } else {
            $scope.portfolio.projects = _.pull($scope.portfolio.projects, projectToRemove);
        }
    };
    $scope.searchProject = function(val) {
        return ProjectService.listByUserAndRole(Session.user.id, 'productOwner', {term: val, create: true, owner: true, light: "startDate,preferences,team,productOwners"}).then(function(projects) {
            var projectsList = _.map($scope.portfolio.projects, function(project) { return project.name; });
            return _.filter(projects, function(project) {
                return !_.includes(projectsList, project.name);
            });
        })
    };
    $scope.alertCancelDeletableProjects = function(deletableProjects) {
        return $uibModal.open({
            keyboard: false,
            backdrop: 'static',
            templateUrl: "confirm.portfolio.cancel.modal.html",
            size: 'md',
            controller: ['$scope', function($scope) {
                _.each(deletableProjects, function(project) {
                    project.delete = true;
                });
                $scope.deletableProjects = deletableProjects;
                $scope.confirmDelete = function() {
                    $scope.$close(_.filter($scope.deletableProjects, function(project) { return project.delete; }));
                };
            }]
        });
    };
}]);

controllers.controller('newPortfolioCtrl', ['$scope', '$controller', '$filter', '$uibModal', 'Session', 'WizardHandler', 'Portfolio', 'Project', 'ProjectService', 'PortfolioService', 'UserService', function($scope, $controller, $filter, $uibModal, Session, WizardHandler, Portfolio, Project, ProjectService, PortfolioService, UserService) {
    $controller('abstractPortfolioCtrl', {$scope: $scope});
    $scope.checkPortfolioPropertyUrl = '/portfolio/available';
    // Functions
    $scope.enableVisibilityChange = function() {
        return isSettings.portfolioPrivateEnabled || Session.admin();
    };
    $scope.isCurrentStep = function(index, name) {
        return WizardHandler.wizard(name).currentStepNumber() === index;
    };
    $scope.createPortfolio = function(portfolioToSave) {
        var p = $scope.preparePortfolio(portfolioToSave);
        $scope.formHolder.creating = true;
        PortfolioService.save(p).then(function(portfolio) {
            $scope.$close(portfolio);
            $scope.openWorkspace(portfolio);
        }).catch(function() {
            $scope.formHolder.creating = false;
        });
    };
    $scope.nameChanged = function() {
        var fkeyModel = $scope.formHolder.portfolioForm.fkey;
        if (!fkeyModel.$touched) {
            $scope.portfolio.fkey = _.upperCase($scope.portfolio.name).replace(/\W+/g, "").substring(0, 10);
            fkeyModel.$setDirty(); // To trigger remote validation
        }
    };
    $scope.portfolioMembersEditable = function() {
        return true;
    };
    var closeFunction = $scope.$close;
    $scope.$close = function(portfolio) {
        if (!portfolio) {
            var deletableProjects = _.filter($scope.portfolio.projects, {new: true});
            if (deletableProjects && deletableProjects.length > 0) {
                var modal = $scope.alertCancelDeletableProjects(deletableProjects);
                modal.result.then(function(projectsToDelete) {
                    if (projectsToDelete === undefined) {
                        return; //go back to wizard
                    } else if (projectsToDelete.length > 0) {
                        _.each(projectsToDelete, $scope.removeProject); //delete
                    }
                    closeFunction();
                }, function() {});
            } else {
                closeFunction();
            }
        } else {
            closeFunction(portfolio);
        }
    };
    // Init
    $scope.formHolder = {};
    $scope.portfolio = new Portfolio();
    angular.extend($scope.portfolio, {
        projects: [],
        businessOwners: [Session.user],
        stakeHolders: [],
        hidden: isSettings.portfolioPrivateDefault && isSettings.portfolioPrivateEnabled
    });
}]);

controllers.controller('editPortfolioModalCtrl', ['$scope', 'PortfolioService', function($scope, PortfolioService) {
    $scope.type = 'editPortfolio';
    $scope.enableVisibilityChange = function() {
        return true;
    };
    $scope.authorizedPortfolio = function(action, portfolio) {
        return PortfolioService.authorizedPortfolio(action, portfolio);
    };
    $scope.setCurrentPanel = function(panel) {
        $scope.panel.current = panel;
    };
    $scope.getCurrentPanel = function() {
        return $scope.panel.current;
    };
    $scope.isCurrentPanel = function(panel) {
        return $scope.panel.current == panel;
    };
    // Mock steps of wizard
    $scope.isCurrentStep = function() {
        return true;
    };
    // Init
    $scope.currentPortfolio = $scope.getPortfolioFromState();
    $scope.checkPortfolioPropertyUrl = '/portfolio/' + $scope.currentPortfolio.id + '/available';
    if (!$scope.panel) {
        var defaultView = $scope.authorizedPortfolio('update', $scope.currentPortfolio) ? 'general' : 'actors';
        $scope.panel = {current: defaultView};
    }
}]);

controllers.controller('editPortfolioCtrl', ['$scope', '$controller', 'Session', 'ProjectService', 'PortfolioService', function($scope, $controller, Session, ProjectService, PortfolioService) {
    $controller('abstractPortfolioCtrl', {$scope: $scope});
    $scope.update = function(portfolio) {
        var p = $scope.preparePortfolio(portfolio);
        PortfolioService.update(p).then(function() {
            $scope.currentPortfolio.projects = [];
            return PortfolioService.listProjects($scope.currentPortfolio).then(function() {
                $scope.notifySuccess('todo.is.ui.portfolio.general.updated');
                $scope.resetPortfolioForm();
            });
        });
    };
    $scope.resetPortfolioForm = function() {
        $scope.resetFormValidation($scope.formHolder.editPortfolioForm);
        $scope.portfolio = angular.copy($scope.currentPortfolio);
    };
    $scope['delete'] = function(portfolio) {
        $scope.confirm({
            message: $scope.message('todo.is.ui.portfoliomenu.submenu.portfolio.delete.confirm'),
            buttonColor: 'danger',
            buttonTitle: 'is.portfoliomenu.submenu.portfolio.delete',
            callback: function() {
                PortfolioService.delete(portfolio).then(function() {
                    document.location = $scope.serverUrl;
                });
            }
        })
    };
    $scope.portfolioMembersEditable = function(portfolio) {
        return PortfolioService.authorizedPortfolio('updateMembers', portfolio);
    };
    $scope.invitationToUserMock = function(invitation) {
        return {email: invitation.email};
    };
    $scope.resetMembersForm = function() {
        $scope.resetFormValidation($scope.formHolder.editPortfolioForm);
        $scope.portfolio = angular.copy($scope.currentPortfolio);
        $scope.portfolio.stakeHolders = $scope.portfolio.stakeHolders.concat(_.map($scope.portfolio.invitedStakeHolders, $scope.invitationToUserMock));
        $scope.portfolio.businessOwners = $scope.portfolio.businessOwners.concat(_.map($scope.portfolio.invitedBusinessOwners, $scope.invitationToUserMock));
    };
    $scope.cancelMembers = function() {
        if ($scope.formHolder.editPortfolioForm.$dirty) {
            $scope.confirm({message: $scope.message('todo.is.ui.portfolio.members.cancel.confirm'), callback: $scope.$close});
        } else {
            $scope.$close();
        }
    };
    $scope.cancelProjects = function() {
        if ($scope.formHolder.editPortfolioForm.$dirty) {
            var deletableProjects = _.filter($scope.portfolio.projects, {new: true});
            if (deletableProjects && deletableProjects.length > 0) {
                var modal = $scope.alertCancelDeletableProjects(deletableProjects);
                modal.result.then(function(projectsToDelete) {
                    if (projectsToDelete === undefined) {
                        return;
                    } else if (projectsToDelete.length > 0) {
                        _.each(projectsToDelete, $scope.removeProject); //delete
                    }
                    $scope.$close();
                }, function() {});
            } else {
                $scope.$close();
            }
        } else {
            $scope.$close();
        }
    };
    var $removeProject = $scope.removeProject;
    $scope.removeProject = function(projectToRemove) {
        $scope.formHolder.editPortfolioForm.editedProjects.$setDirty();
        $removeProject(projectToRemove);
    };
    // Init
    $scope.formHolder = {};
    $scope.resetPortfolioForm();
}]);

controllers.controller('portfolioProjectChartWidgetCtrl', ['$scope', 'ProjectService', '$controller', '$element', function($scope, ProjectService, $controller, $element) {
    $controller('projectChartWidgetCtrl', {$scope: $scope, $element: $element});
    var widget = $scope.widget; // $scope.widget is inherited
    // Erase existing method to limit the project search to the ones in the portfolio
    $scope.refreshProjects = function(term) {
        if (widget.settings && widget.settings.project && !$scope.holder.projectResolved) {
            ProjectService.get(widget.settings.project.id).then(function(project) {
                $scope.holder.projectResolved = true;
                $scope.holder.project = project;
                $scope.project = project; // Required for projectChartCtrl
            });
        }
        $scope.projects = _.filter($scope.portfolio.projects, function(project) {
            return !term || project.name.toLowerCase().indexOf(term.toLowerCase()) != -1;
        });
    };
    // Init
    $scope.portfolio = $scope.getPortfolioFromState()
}]);

controllers.controller('portfolioProjectsWidgetCtrl', ['$scope', function($scope) {
    // Init
    $scope.portfolio = $scope.getPortfolioFromState();
    $scope.projects = $scope.portfolio.projects;
}]);
