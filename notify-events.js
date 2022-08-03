module.exports = function(RED) {

    const Message = require('@notify.events/nodejs').Message;

    function NotifyEventsNode(config) {
        RED.nodes.createNode(this, config);

        const node = this;

        node.name         = config.name         || '';
        node.channel      = config.channel      || null;
        node.title        = config.title        || '';
        node.titleType    = config.titleType    || 'str';
        node.text         = config.text         || 'payload';
        node.textType     = config.textType     || 'msg';
        node.priority     = config.priority     || 'normal';
        node.priorityType = config.priorityType || 'ne_priority';
        node.level        = config.level        || 'info';
        node.levelType    = config.levelType    || 'ne_level';
        node.images       = config.images       || [];
        node.files        = config.files        || [];
        node.actionHost   = config.actionHost   || 'localhost';
        node.actions      = config.actions      || [];

        const actionPath = '/notify-events/' + node.id + '/action/:actionIndex';

        if (RED.settings.httpNodeRoot !== false) {
            RED.httpNode.get(actionPath, function(req, res) {
                const msgid = RED.util.generateId();
                const index = req.params.actionIndex;

                const action = node.actions[index];

                if (!action) {
                    res.status(404).send('Unknown action');

                    return;
                }

                let msg = [];

                msg[index] = {
                    _msgid:  msgid,
                    payload: {
                        index: index,
                        name:  action.name,
                    },
                };

                node.send(msg);

                res.send('OK');
            });

            node.on('close',function() {
                RED.httpNode._router.stack.forEach(function(route, i, routes) {
                    if (route.route && (route.route.path === actionPath)) {
                        routes.splice(i, 1);
                    }
                });
            });
        } else {
            node.warn('Action not created!');
        }

        function getValue(msg, field, fieldType, customType) {
            if ((customType !== undefined) && (fieldType === customType)) {
                return field;
            } else if (fieldType === 'msg') {
                let value = msg;

                field.split('.').forEach(key => {
                    value = value[key];
                });

                return value;
            } else if (fieldType === 'str') {
                return field;
            }

            throw new Error('Unknown fieldType: ' + fieldType);
        }

        function getFiles(msg, files) {
            let list = [];

            files.forEach(function(file) {
                list.push({
                    type:  file.type,
                    value: getValue(msg, file.value, file.valueType),
                });
            });

            return list;
        }

        node.on('input', function(msg) {
            let title    = getValue(msg, node.title,    node.titleType);
            let text     = getValue(msg, node.text,     node.textType);
            let priority = getValue(msg, node.priority, node.priorityType, 'ne_priority');
            let level    = getValue(msg, node.level,    node.levelType, 'ne_level');

            const message = new Message(text, title, priority, level);

            const images = getFiles(msg, node.images);

            images.forEach(function(image) {
                message.addImage(image.value);
            });

            const files = getFiles(msg, node.files);

            files.forEach(function(file) {
                message.addFile(file.value);
            });

            node.actions.forEach(function(action, index) {
                const url = node.actionHost + '/notify-events/' + node.id + '/action/' + index;

                message.addAction('node-red-action-' + index, action.name, url);
            });

            const channel = RED.nodes.getNode(node.channel);

            message.send(channel.getToken());
        });
    }

    RED.nodes.registerType("notify-events", NotifyEventsNode);

    function NotifyEventsChannelNode(config) {
        RED.nodes.createNode(this, config);

        const node = this;

        node.name      = config.name      || '';
        node.token     = config.token     || '';
        node.tokenType = config.tokenType || 'str';

        node.getToken = function() {
            switch (node.tokenType) {
                case 'str':  return node.token;
                case 'env':  return env.get(node.token);
                default: {
                    throw new Error('Unknown tokenType: ' + node.tokenType);
                }
            }
        }
    }

    RED.nodes.registerType('notify-events-channel', NotifyEventsChannelNode);

}
