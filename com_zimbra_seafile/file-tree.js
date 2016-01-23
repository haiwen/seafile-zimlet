    $.jstree._themes = '/service/zimlet/_dev/com_zimbra_seafile/themes/';

    var FileTree = {

        options: {},

        formatRepoData: function(data) {
            var repos = [], repo;
            for (var i = 0, len = data.length; i < len; i++) {
                repo = {
                    'data': data[i].name,
                    'attr': {'repo_id': data[i].id, 'root_node': true},
                    'state': 'closed'
                }
                repos.push(repo);
            }
            return repos;
        },

        renderFileTree: function(container, repo_data, options) {
            //var opts = options || {};
            container
            .delegate('.jstree-closed', 'dblclick', function(e) {
                container.jstree('open_node', $(this));
                $(this).find('a').removeClass('jstree-clicked');
            })
            .bind('select_node.jstree', function(e, data) {
                $('.jstree-clicked').removeClass('jstree-clicked'); // do not show selected item
            })
            .jstree({
                'json_data': {
                    'data': repo_data,
                    'ajax': {
                        'url': function(data) {
                            var path = this.get_path(data);
                            var repo_id;
                            if (path.length == 1) {
                                path = '/';
                                repo_id = data.attr('repo_id');
                            } else {
                                var root_node = data.parents('[root_node=true]');
                                repo_id = root_node.attr('repo_id');
                                path.shift();
                                path = '/' + path.join('/') + '/';
                            }
                            return options.getUrl(repo_id, path);
                        },
                        'beforeSend': options.beforeSend,
                        'success': function(data) {
                            var items = [];
                            var o, item;
                            for (var i = 0, len = data.length; i < len; i++) {
                                o = data[i];
                                if (o.type == 'dir') {
                                    item = {
                                        'data': o.name,
                                        'attr': { 'type': o.type },
                                        'state': 'closed'
                                    };
                                } else {
                                    item = {
                                        'data': o.name,
                                        'attr': {'type': o.type }
                                    };
                                }
                                items.push(item);
                            }
                            return items;
                        }
                    }
                },
                'core': {
                    'animation': 100
                },
                'themes': {
                    'theme':'classic'
                },
                'checkbox':{
                    //'two_state': opts.two_state, // default: false. when 'true', dir can be checked separately with file
                    // make dir can only be selected
                    //'override_ui':true, // nodes can be checked, or selected to be checked
                    'real_checkboxes': true,
                    'real_checkboxes_names': function(node) {
                        // get the path array consisting of nodes starting from the root node
                        var path_array = this.get_path(node);
                        var repo_id, path;
                        if (path_array.length == 1) {
                            // root node
                            path = '/';
                            repo_id = node.attr('repo_id');
                        } else {
                            path_array.shift();
                            repo_id = node.parents('[root_node=true]').attr('repo_id');
                            if (node.attr('type') == 'dir') {
                                path = '/' + path_array.join('/') + '/';
                            } else {
                                path = '/' + path_array.join('/');
                            }
                        }
                        return ['selected', repo_id + path];
                    }
                },
                'plugins': ['themes', 'json_data', 'ui', 'checkbox']
            });
        }

    };
