> js模板引擎减少了html的书写，通过js语句（如循环等）能更方便操作数据，实现数据和视图的分离，更易于维护

<!--more-->

## 零 模板引擎操作

ejs等模板类似的语法如下

~~~javascript
<ul>
    <% for(var i in items) { %>
        <li class='<%= items[i].class %>'><%= items[i].text %></li>
    <% } %>
</ul>
~~~

传入数据

~~~javascript
var items = [{
       class: "text",
       text: "number1"
   }, {
       class: "text",
       text: "number2"
   },
   {
       class: "text",
       text: "number3"
   }]

~~~

最后渲染成如下的html片段

~~~javascript
<ul>
    <li class='text'>number1</li> 
    <li class='text'>number2</li> 
    <li class='text'>number3</li> 
</ul>
~~~

## 一 原理

> 实质上是将模板转化为代码执行，通过该代码生成一个函数，传入代码中需要渲染的数据

#### 1 模板改写为js代码

~~~javascript
var temp = '<ul>';
for(var i in items) {
    temp += "<li class='" + items[i].class + "'>" + items[i].text + "</li>";
}
temp += '</ul>'
~~~

将模板转化为代码执行，和模板相比：
> **1 遇到普通文本直接拼接字符串**
> **2 遇到如 <% %>, 直接当成代码**
> **3 遇到如 <%= %>, 将其中的内容当成变量拼接在字符串中**

#### 2 生成函数

只需要上述转换后的js代码包裹在函数中，传入渲染的数据进行调用

~~~js
function template(items) {
    var temp = '<ul>';
    for(var i in items) {
        temp += "<li class='" + items[i].class + "'>" + items[i].text + "</li>";
    }
    temp += '</ul>'
}

// 直接调用
template(items)
~~~

> 因为js代码拼接出来的是字符串, 利用 new Function(arg1, arg2, ... , argN, function_string) 生成函数

#### 3 正则匹配

设置<%= %>和<% %>的正则，捕获分组

~~~javascript
// <%= %>包含<% %>，因此对<%= %>正则有更高的优先级

var matcher = /<%=([\s\S]+?)%>|<%([\s\S]+?)%>/g
~~~

使用replace()并不是用来替换正则匹配的文本，而是对匹配出来的文本拼接 function_string

> __stringObj.replace(reg/str, replacement)__
> 参数 replacement 可是函数，在此情况下，**每个匹配都会调用该函数**，返回的文本将作为替换文本（也可不返回）。
> 该 replacement 函数第一个参数是**匹配模式的字符串**；
> 接下来的参数是**与模式中的子表达式(分组)相匹配的字符串**，可以是0个或多个；
> 接下来的参数是一个整数，是匹配在stringObj的位置；
> 最后一个参数是stringObj本身

## 二 实现

#### 1 初步实现

tpl.js

~~~javascript
// $ 添加行尾的匹配，是因为没有$无法将最后一个<%%>或<%= %>后面的部分拼接进来

var matcher = /<%=([\s\S]+?)%>|<%([\s\S]+?)%>|$/g // 需要非贪婪匹配

// text 传入的模板
// data 渲染的数据
function template(text, data) {
    var index = 0 // 记录当前扫描到了哪里
    var function_string = "var temp = '';"
    function_string += "temp += '"
    text.replace(matcher, function(match, interpolate, evaluate, offset) {
        // match 匹配模式的字符串，
        // interpolate 为第1个子表达式匹配的字符串， 即 <%= %> 中的变量
        // evaluate 为第2个子表达式匹配的字符串， 即 <% %> 中的 js代码
        // offset 为匹配模式的字符串在text中的初始位置
        function_string += text.slice(index, offset)
        // 如果是<%= %> 变量 拼接字符串
        if (interpolate) {
            function_string += "' + " + interpolate + " + '"
        }
        // 如果是<% %> 变量 直接作为代码
        if (evaluate) {
            function_string += "';" + evaluate + "temp +='"
        }
        // 递增index，跳出interpolate或evaluate
        index = offset + match.length
    })
    // 最后代码是返回temp 也就是返回拼接好的字符串
    function_string += "';return temp;"
    // 通过function_string 生成函数 传入数据渲染
    var render = new Function('obj', function_string)
    return render(data)
}
~~~

index.html中调用

~~~javascript
<!DOCTYPE html>
<html lang="en">
<head>
</head>
<body>
<script src="./tpl.js"></script>
<script id='template' type='javascript/template'>
<ul>
    <% for(var i in obj){ %>
    <li class="<%= obj[i].class %>"><%= obj[i].text %></li>
    <% } %>
</ul>
</script>
<script>
    var text = document.getElementById('template').innerHTML
    var items = [{
           class: "text",
           text: "number1"
       }, {
           class: "text",
           text: "number2"
       },
       {
           class: "text",
           text: "number3"
       }]
    console.log(template(text, items))
</script>
</body>
</html>
~~~

#### 2 bug修复

需要增加对模板中的一些特殊字符进行转义, 如\n \r \t

tpl.js修改为

~~~javascript
// $ 添加行尾的匹配，是因为没有$无法将最后一个<% %>或<%= %>后面的部分拼接进来

var matcher = /<%=([\s\S]+?)%>|<%([\s\S]+?)%>|$/g

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
  };

// text 传入的模板
// data 渲染的数据
function template(text, data) {
    var index = 0 // 记录当前扫描到了哪里
    var function_string = "var temp = '';"
    function_string += "temp += '"
    text.replace(matcher, function(match, interpolate, evaluate, offset) {
        // match 匹配模式的字符串，
        // interpolate 为第1个子表达式匹配的字符串， 即 <%= %> 中的变量
        // evaluate 为第2个子表达式匹配的字符串， 即 <% %> 中的 js代码
        // offset 为匹配模式的字符串在text中的初始位置
        function_string += text.slice(index, offset)
            .replace(escapes, function(match) { return '\\' + escapes[match] })
        // 如果是<%= %> 变量 拼接字符串
        if (interpolate) {
            function_string += "' + " + interpolate + " + '"
        }
        // 如果是<% %> 变量 直接作为代码
        if (evaluate) {
            function_string += "';" + evaluate + "temp +='"
        }
        // 递增index，跳出interpolate或evaluate
        index = offset + match.length
    })
    // 最后代码是返回temp 也就是返回拼接好的字符串
    function_string += "';return temp;"
    // 利用function_string 生成函数
    var render = new Function('obj', function_string)
    return render(data)
}
~~~
