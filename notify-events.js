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
        node.priorityType = config.priorityType || 'str';
        node.level        = config.level        || 'info';
        node.levelType    = config.levelType    || 'str';
        node.images       = config.images       || [];
        node.files        = config.files        || [];

        function getValue(msg, field, fieldType) {
            if (fieldType === 'msg') {
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
            let priority = getValue(msg, node.priority, node.priorityType);
            let level    = getValue(msg, node.level,    node.levelType);

            let images   = getFiles(msg, node.images);
            let files    = getFiles(msg, node.files);

            const channel = RED.nodes.getNode(node.channel);

            const message = new Message(text, title, priority, level);

            images.forEach(function(image) {
                message.addImage(image.value);
            });

            files.forEach(function(file) {
                message.addFile(file.value);
            });

            message.send(channel.token);
        });
    }

    RED.nodes.registerType("notify-events", NotifyEventsNode);

    function NotifyEventsChannelNode(config) {
        RED.nodes.createNode(this, config);

        const node = this;

        node.name  = config.name  || '';
        node.token = config.token || '';
    }

    RED.nodes.registerType('notify-events-channel', NotifyEventsChannelNode);
}
