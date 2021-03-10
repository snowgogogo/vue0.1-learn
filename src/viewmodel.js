var Compiler = require('./compiler'),
    utils = require('./utils'),
    transition = require('./transition'),
    Batcher = require('./batcher'),
    slice = [].slice,
    def = utils.defProtected,
    nextTick = utils.nextTick,
    fileName = 'viewmodel.js',

    // batch $watch callbacks
    watcherBatcher = new Batcher(),
    watcherId = 1

/**
 *  ViewModel exposed to the user that holds data,
 *  computed properties, event handlers
 *  and a few reserved methods
 */
function ViewModel(options) {
    utils.log('create new VM, options: ' + JSON.stringify(options), fileName);
    // compile if options passed, if false return. options are passed directly to compiler
    if (options === false) return
    new Compiler(this, options)
}

/**
 * All VM prototype methods are inenumerable
 * so it can be stringified/looped through as raw data
 * 所有的viewModel原型**方法**都是不可枚举的,因此可以将其作为原始数据进行字符串化/循环处理
 * 应用场景 :
 * var demo = new Vue(); // 这里Vue 其实就是ViewModel;
 * 在 ViewModel 原型上面定义的方法,可以在demo上面使用;并且所有方法因为都是不可枚举的.
 */
var VMProto = ViewModel.prototype

/**
 * vm instance methods: $init
 * vm instance methods/data: $get | $set | $watch | $unwatch
 * vm instance methods/lifecycle: $destroy
 * vm instance methods/events: $broadcast | $dispatch | $emit | $on | $off | $once
 * vm instance methods/dom: $appendTo | $remove | $before | $after
 */

/**
 *  init allows config compilation after instantiation:
 *    var a = new Vue(false)
 *    a.init(config)
 */
def(VMProto, '$init', function(options) {
    utils.log('vm instance methods: $init', fileName);
    new Compiler(this, options)
})

/**
 *  Convenience function to get a value from
 *  a keypath
 */
def(VMProto, '$get', function(key) {
    utils.log('vm instance methods/data: $get', fileName);
    var val = utils.get(this, key)
    return val === undefined && this.$parent
        ? this.$parent.$get(key)
        : val
})

/**
 *  Convenience function to set an actual nested value
 *  from a flat key string. Used in directives.
 */
def(VMProto, '$set', function(key, value) {
    utils.log('vm instance methods/data: $set', fileName);
    utils.set(this, key, value)
})

/**
 *  watch a key on the viewmodel for changes
 *  fire callback with new value
 */
def(VMProto, '$watch', function(key, callback) {
    utils.log('vm instance methods/data: $watch', fileName);
    // save a unique id for each watcher
    var id = watcherId++,
        self = this
    function on() {
        var args = slice.call(arguments)
        watcherBatcher.push({
            id: id,
            override: true,
            execute: function() {
                callback.apply(self, args)
            }
        })
    }
    callback._fn = on
    self.$compiler.observer.on('change:' + key, on)
})

/**
 *  unwatch a key
 */
def(VMProto, '$unwatch', function(key, callback) {
    utils.log('vm instance methods/data: $unwatch', fileName);
    // workaround here
    // since the emitter module checks callback existence
    // by checking the length of arguments
    var args = ['change:' + key],
        ob = this.$compiler.observer
    if (callback) args.push(callback._fn)
    ob.off.apply(ob, args)
})

/**
 *  unbind everything, remove everything
 */
def(VMProto, '$destroy', function(noRemove) {
    utils.log('vm instance methods/lifecycle: $destroy', fileName);
    this.$compiler.destroy(noRemove)
})

/**
 *  broadcast an event to all child VMs recursively.
 */
def(VMProto, '$broadcast', function() {
    utils.log('vm instance methods/events: $broadcast', fileName);
    var children = this.$compiler.children,
        i = children.length,
        child
    while (i--) {
        child = children[i]
        child.emitter.applyEmit.apply(child.emitter, arguments)
        child.vm.$broadcast.apply(child.vm, arguments)
    }
})

/**
 *  emit an event that propagates all the way up to parent VMs.
 */
def(VMProto, '$dispatch', function() {
    utils.log('vm instance methods/events: $dispatch', fileName);
    var compiler = this.$compiler,
        emitter = compiler.emitter,
        parent = compiler.parent
    emitter.applyEmit.apply(emitter, arguments)
    if (parent) {
        parent.vm.$dispatch.apply(parent.vm, arguments)
    }
})

    /**
     *  delegate on/off/once to the compiler's emitter
     */
    ;['emit', 'on', 'off', 'once'].forEach(function(method) {
        // internal emit has fixed number of arguments.
        // exposed emit uses the external version
        // with fn.apply.
        var realMethod = method === 'emit'
            ? 'applyEmit'
            : method
        def(VMProto, '$' + method, function() {
            utils.log('vm instance methods/events: $' + method, fileName);
            var emitter = this.$compiler.emitter
            emitter[realMethod].apply(emitter, arguments)
        })
    })

// DOM convenience methods

def(VMProto, '$appendTo', function(target, cb) {
    utils.log('vm instance methods/dom: $appendTo', fileName);
    target = query(target)
    var el = this.$el
    transition(el, 1, function() {
        target.appendChild(el)
        if (cb) nextTick(cb)
    }, this.$compiler)
})

def(VMProto, '$remove', function(cb) {
    utils.log('vm instance methods/dom: $remove', fileName);
    var el = this.$el
    transition(el, -1, function() {
        if (el.parentNode) {
            el.parentNode.removeChild(el)
        }
        if (cb) nextTick(cb)
    }, this.$compiler)
})

def(VMProto, '$before', function(target, cb) {
    utils.log('vm instance methods/dom: $before', fileName);
    target = query(target)
    var el = this.$el
    transition(el, 1, function() {
        target.parentNode.insertBefore(el, target)
        if (cb) nextTick(cb)
    }, this.$compiler)
})

def(VMProto, '$after', function(target, cb) {
    utils.log('vm instance methods/dom: $after', fileName);
    target = query(target)
    var el = this.$el
    transition(el, 1, function() {
        if (target.nextSibling) {
            target.parentNode.insertBefore(el, target.nextSibling)
        } else {
            target.parentNode.appendChild(el)
        }
        if (cb) nextTick(cb)
    }, this.$compiler)
})

function query(el) {
    return typeof el === 'string'
        ? document.querySelector(el)
        : el
}

module.exports = ViewModel
