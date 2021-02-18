var TextParser = require('./text-parser')

module.exports = {
    prefix: 'v',
    debug: true, // 修改设置,debug 设置为true方便调试 默认false
    silent: false,
    enterClass: 'v-enter',
    leaveClass: 'v-leave',
    interpolate: true
}

Object.defineProperty(module.exports, 'delimiters', {
    get: function() {
        return TextParser.delimiters
    },
    set: function(delimiters) {
        TextParser.setDelimiters(delimiters)
    }
})