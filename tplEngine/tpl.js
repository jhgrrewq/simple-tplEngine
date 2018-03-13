// 简单的的模板引擎原理和实现
/**
 * 1 遇到普通文本就拼接字符串
 * 2 遇到如<%= %>, 将其中内容当成变量拼接在字符串中
 * 3 遇到如<% %>, 直接当成代码
 *
 * 利用new Function（arg, function_body）生成动态函数， 传入数据，和转化后的模板js代码拼接的字符串
 */

// $ 添加行尾的匹配，是因为没有$无法将最后一个<%%>或<%= %>后面的部分拼接进来

var matcher = /<%=([\s\S]+?)%>|<%([\s\S]+?)%>|$/g; // 需要非贪婪匹配

// 对模板中的特殊字符增加转义处理
var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
}

// text 传入的模板
// data 渲染的数据
// function template(text, data) {
//     var index = 0; // 记录当前扫描到了哪里
//     var function_string = '';
//     text.replace(matcher, function(match, interpolate, evaluate, offset) {
//         // match 匹配模式的字符串，
//         // interpolate 为第1个子表达式匹配的字符串， 即 <%= %> 中的变量
//         // evaluate 为第2个子表达式匹配的字符串， 即 <% %> 中的 js代码
//         // offset 为匹配模式的字符串在text中的初始位置

//         function_string += text.slice(index, offset)
//             .replace(escaper, function(match) { return '\\' + escapes[match]; })


//         // 如果是<%= %> 变量 拼接字符串
//         if(interpolate){
//             function_string += "' + " + interpolate + " + '";
//         }
//         // 如果是<% %> 变量 直接作为代码
//         if(evaluate){
//             function_string += "';" + evaluate + "temp += '";
//         }
//         // 递增index，跳出interpolate或evaluate
//         index = offset + match.length;
//     })

//     // 最后拼接函数字符串，返回temp
//     // 添加 with(expression) {statement}
//     var tpl = "var temp = '';temp += '" + function_string + "';return temp;";
//     console.log(tpl)
//     // 通过function_string 生成函数 传入数据渲染
//     var render = new Function('obj', tpl);
//     return render(data)
// }

function template(text, data) {
    var function_string = text.replace(escaper, function(match) { return '\\' + escapes[match]; })
        .replace(/<%=([\s\S]+?)%>/g, function(match, code) {
            return "' + " + code + " + '" 
        })
        .replace(/<%([\s\S]+?)%>/g, function(match, code) {
            return "';" + code + "temp += '" 
        })

    var tpl = "var temp = '';\nwith(obj || {}) {\ntemp += '" + function_string + "'\n};\nreturn temp;";
    // 生成函数 传入数据渲染
    var render = new Function('obj', tpl);
    return render(data)
}


