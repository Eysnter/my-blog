---
title: ① JavaSE(类型.运算符.表达式)
published: 2026-05-27
image: 'https://img.eysnter.cn/file/posts/posts2-notes/JavaSE/1780499976120_JavaSE-1.jpg'
tags: [JavaSE,知识点]
category: 'JavaSE'
draft: false
description: 阐述 Java 基础语法，核心包含基本数据类型、变量转换及运算符表达式的计算规则。
lang: zh-CN
comment: true
---

# 一、JAVA 基础概念

> <span style="color:#60a5fa;font-weight:700;">🔵 核心概念</span>　<span style="color:#34d399;font-weight:700;">🟢 推荐实践</span>　<span style="background-color:rgba(251,191,36,.20);color:#f59e0b;font-weight:700;padding:2px 6px;border-radius:4px;">🟡 高频考点</span>　<span style="color:#f87171;font-weight:700;text-decoration:underline wavy #f87171;text-underline-offset:3px;">🔴 风险 / 易错点</span>

##  一、注释 (Comments)
java 里的三种注释:
- 单行注释
```java
// 这是java的单行注释
```
- 多行注释
```java
/*
这是java的多行注释
这是java的多行注释
这是java的多行注释
*/
```
- 文档注释
```java
/**
这是 java 的多行注释
这是 java 的多行注释
这是 java 的多行注释
*/
```

## 二、关键字

<span style="color:#60a5fa;font-weight:700;">关键字是被 Java 语言赋予特定含义的保留单词，不能用作普通标识符。</span>

| **abstract**   | **assert**       | **boolean**   | **break**      | **byte**   |
| -------------- | ---------------- | ------------- | -------------- | ---------- |
| **case**       | **catch**        | **char**      | **class**      | **const**  |
| **continue**   | **default**      | **do**        | **double**     | **else**   |
| **enum**       | **extends**      | **final**     | **finally**    | **float**  |
| **for**        | **goto**         | **if**        | **implements** | **import** |
| **instanceof** | **int**          | **interface** | **long**       | **native** |
| **new**        | **package**      | **private**   | **protected**  | **public** |
| **return**     | **strictfp**     | **short**     | **static**     | **super**  |
| **switch**     | **synchronized** | **this**      | **throw**      | **throws** |
| **transient**  | **try**          | **void**      | **volatile**   | **while**  |
### 1、 关键字 class

<span style="color:#60a5fa;font-weight:700;">`class` 表示定义类</span>
`HelloWorld` 类的类名
`{}` 类的范围

<span style="text-decoration:underline wavy #60a5fa;text-underline-offset:3px;">类是 Java 程序最基本的组成单元，一个完整项目通常由多个类共同组成。</span>

```java
class HelloWorld{

}
```

### 2、 字面量 (Literals)
<span style="color:#60a5fa;font-weight:700;">字面量：数据在程序源代码中的直接书写形式。</span>

| **字面量类型** | **说明**                    | **程序中的写法**          |
| --------- | ------------------------- | ------------------- |
| 整数        | 不带小数的数字                   | 666，-88             |
| 小数        | 带小数的数字                    | 13、14，-5.21         |
| 字符        | 必须使用单引号，有且仅能一个字符          | ‘A’，‘0’，   ‘我’      |
| 字符串       | 必须使用双引号，内容可有可无            | “HelloWorld”，“我爱中国” |
| 布尔值       | 布尔值，表示真假，只有两个值：true，false | true 、false         |
| 空值        | 一个特殊的值，空值                 | 值是：null             |
```java
public class Demo {
    public static void main(String[] args) {
        System.out.println(10);             // 输出一个整数
        System.out.println(5.5);            // 输出一个小数
        System.out.println('a');            // 输出一个字符
        System.out.println(true);           // 输出boolean值true
        System.out.println("HelloWorld");   // 输出字符串
    }
}
```

**控制台输出结果**：
```bash title="bash"
10
5.5
a
true
HelloWorld
```


## 三、变量
- <span style="color:#60a5fa;font-weight:700;">本质：变量是内存中用于临时存储数据的容器。</span>
- **定义格式**：
$$\text{数据类型} \quad \text{变量名} = \text{数据值};$$

1. <span style="color:#f87171;font-weight:700;">不能重名：</span>在同一个作用域（同一对 `{}`）内，变量名不允许重复定义。
2. <span style="color:#f59e0b;font-weight:700;">必须初始化：</span>局部变量在使用（如打印、参与运算）之前必须先赋值，否则编译报错。
3. <span style="color:#60a5fa;font-weight:700;">类型约束：</span>变量只能存储与声明类型兼容的数据。

- **核心规则代码演示**：
```java
public class VariableDemo {
    public static void main(String[] args) {
        // 1、 变量名不允许重复
        // int a = 10;
        // int a = 20; // 编译报错：变量 a 已被定义

        // 2、 一条语句可以定义多个变量（了解即可，实际开发不推荐，影响阅读）
        // int a = 10, b = 20, c = 20, d = 20;
        // System.out.println(a);
        // System.out.println(b);

        // 3、 变量在使用之前必须要赋值
        int a = 30;
        System.out.println(a); // 正常输出 30
    }
}
```

- **经典实战演示（游戏角色属性变化模拟）**：
```java
public class GameTest {
    public static void main(String[] args) {
        // 初始状态：血量 100，金币 0
        int hp = 100;
        int gold = 0;

        // 第一阶段：击败小怪，获得 50 金币，扣除 20 生命值
        gold = gold + 50;
        hp = hp - 20;

        // 第二阶段：在商店花费 30 金币购买药水，恢复 40 生命值
        gold = gold - 30;
        hp = hp + 40;

        // 第三阶段：完成隐藏任务，获得 100 金币奖励
        gold = gold + 100;

        // 最终状态输出
        System.out.println("角色最终生命值 (HP)：" + hp);   // 120
        System.out.println("角色最终金币数量：" + gold);    // 120
    }
}
```

## 四、数据类型
Java 的数据类型分为两大家族：<span style="color:#60a5fa;font-weight:700;">基本数据类型</span>与<span style="color:#a78bfa;font-weight:700;">引用数据类型</span>（如 `String`、数组、自定义类等）。

### 1、 8种基本数据类型
- <span style="background-color:rgba(251,191,36,.18);color:#f59e0b;font-weight:700;padding:2px 6px;border-radius:4px;">整数常量默认是 `int`，浮点常量默认是 `double`。</span>

| 分类      | 关键字       | 占用字节 (Byte) | 取值范围                                          | 默认后缀要求               |
| ------- | --------- | ----------- | --------------------------------------------- | -------------------- |
| **整数**  | `byte`    | 1           | $-128 \sim 127$                               | 无                    |
|         | `short`   | 2           | $-32768 \sim 32767$                           | 无                    |
|         | `int`     | 4           | 约 $\pm 21$ 亿                                  | 无                    |
|         | `long`    | 8           | $-2^{63} \sim 2^{63}-1$                       | 数值后必须加 **`L`** / `l` |
| **浮点数** | `float`   | 4           | $1.4 \times 10^{-45} \sim 3.4 \times 10^{38}$ | 数值后必须加 **`F`** / `f` |
|         | `double`  | 8           | 精度更高，取值更大                                     | 无                    |
| **字符**  | `char`    | 2           | $0 \sim 65535$ (字符的 Unicode 码)                | 无                    |
| **布尔**  | `boolean` | 1           | `true` 或 `false`                              | 无                    |

<span style="color:#f87171;font-weight:700;text-decoration:underline wavy #f87171;text-underline-offset:3px;">易错：long 字面量建议使用大写 `L`，float 字面量必须添加 `F`/`f` 后缀；`boolean` 只能取 `true` 或 `false`。</span>

### 2、数据类型实战：
```java
public class VariableTest {
    public static void main(String[] args) {
        // --- 实战场景 1：记录教师个人基本信息 ---
        String teacherName = "小明";
        int teacherAge = 18;
        char teacherGender = '男';
        double teacherHeight = 180.1;
        boolean isMarried = true;

        // --- 实战场景 2：记录电影媒介数据 ---
        String movieName = "送初恋回家";
        String mainActor = "小刚";
        int releaseYear = 2020;
        double movieScore = 9.0;

        // --- 实战场景 3：记录手机商品属性 ---
        String phoneBrand = "华为";
        double phonePrice = 5299.0;

        // --- 控制台格式化输出部分演示 ---
        System.out.println("====== 教师基本信息 ======");
        System.out.println("姓名：" + teacherName + " | 年龄：" + teacherAge + " | 性别：" + teacherGender);
        
        System.out.println("\n====== 推荐电影信息 ======");
        System.out.println("电影名：《" + movieName + "》 | 主演：" + mainActor + " | 评分：" + movieScore);

        System.out.println("\n====== 热门商品推荐 ======");
        System.out.println("品牌：" + phoneBrand + " | 价格：" + phonePrice + " 元");
    }
}
```

- **控制台运行输出结果**：
```bash
====== 教师基本信息 ======
姓名：曹丹 | 年龄：18 | 性别：男

====== 推荐电影信息 ======
电影名：《送初恋回家》 | 主演：刘鑫 | 评分：9.0

====== 热门商品推荐 ======
品牌：华为 | 价格：5299.0 元
```

## 五. 标识符命名规范

### 1、硬性要求

1. 只能由<span style="color:#60a5fa;font-weight:700;">数字、字母、下划线 `_`、美元符号 `$`</span>组成。
2. <span style="color:#f87171;font-weight:700;">绝对不能以数字开头。</span>
3. <span style="color:#f87171;font-weight:700;">不能是 Java 关键字</span>（如：不能用 `class`、`public`、`void` 做变量名）。
4. <span style="color:#f59e0b;font-weight:700;">严格区分大小写</span>（如 `username` 和 `userName` 是两个不同的变量）。
### 2、软性规范

- <span style="color:#34d399;font-weight:700;">小驼峰命名法（变量名、方法名）</span>：
    - 单个单词：全小写。例如：`name`，`age`。 
    - 多个单词：从第二个单词开始，首字母大写。例如：`firstName`，`maxAge`，`studentCount`。 
- <span style="color:#a78bfa;font-weight:700;">大驼峰命名法（类名）</span>：
    - 每个单词的首字母都要大写。例如：`Demo`，`HelloWorld`，`ScannerDemo`。
### 3、阿里巴巴命名规范

- **不要使用拼音/英文混合命名**（除国际通用的地名等拼音外）：
    - ❌ 错误示例：`jiage` (价格)、`dazhe` (打折)、`myNameYuan`
    - 正确示例：`price`、`discount` 
- **不要无故使用下划线 `_` 或美元符 `$` 命名**：
    - ❌ 错误示例：`_name`、`$money`、`gender_`  
    - 正确示例：`name`、`money`、`gender`  
- <span style="color:#34d399;font-weight:700;">命名必须“见名知意”</span>：避免定义 `int a`、`double b` 这类缺少业务含义的名称。


---
# 二、 运算符和表达式

## 一、键盘录入 (Scanner)
当需要从控制台接收用户输入的数据时，直接使用 Java 内置的 `Scanner` 工具类。

### 极简三步法模板：

<span style="background-color:rgba(96,165,250,.14);color:#60a5fa;font-weight:700;padding:2px 6px;border-radius:4px;">Scanner 三步：导包 → 创建对象 → 调用 `nextXxx()` 读取数据。</span>

```java
// 第一步：导包（必须写在类定义 class 的上面）
import java.util.Scanner; 

public class ScannerDemo {
    public static void main(String[] args) {
        // 第二步：创建键盘录入对象
        Scanner sc = new Scanner(System.in); 
        System.out.println("请输入一个数字：");
        
        // 第三步：调用 nextInt() 接收数据，并赋值给变量 i
        int i = sc.nextInt(); 
        
        System.out.println("您录入的数字是：" + i);
    }
}
```

## 二、隐式与强制类型转换

### 1、 隐式转换（自动类型提升）

- **规则**：表示范围较小的数值类型赋给范围较大的类型时，编译器可自动完成转换。
- **方向**：`byte → short → int → long → float → double`；`char → int → long → float → double`。
- <span style="color:#f87171;font-weight:700;">注意：`byte`/`short` 与 `char` 之间不能直接进行隐式转换。</span>
- <span style="background-color:rgba(251,191,36,.20);color:#f59e0b;font-weight:700;padding:2px 6px;border-radius:4px;">必考：`byte`、`short`、`char` 参与算术运算时，会先提升为 `int`。</span>
    
- **极简自测**：
    
    - `byte b1 = 10; byte b2 = 20; ??? result = b1 + b2;` $\rightarrow$ `result` 必须是 **`int`** 类型（`byte + byte` 提升为 `int`）。
    - `int i = 10; long n = 20L; ??? result = i + n;` $\rightarrow$ `result` 必须是 **`long`** 类型（`int` 自动提升为 `long`）。
        

### 2、 强制类型转换

- **规则**：大范围类型转换为小范围类型时，需要显式强制转换：`目标类型 变量 = (目标类型) 数据;`。
    
- <span style="color:#f87171;font-weight:700;text-decoration:underline wavy #f87171;text-underline-offset:3px;">副作用：强制转换可能造成精度丢失或数据溢出，且不会自动报错。</span>
```java
double a = 12.3;
int b = (int) a; // b = 12 (小数部分直接丢失)
```

## 三、算术运算符与数值拆分

### 1、 算术运算符基础

- 符号：`+`、`-`、`*`、`/`、`%`。
    
- <span style="color:#f87171;font-weight:700;">`/`（除法）陷阱：</span>
    1、 整数相除只能得到整除结果（截断舍弃小数）。如 `10 / 3` 的结果是 `3`。
    1. 如果想要得到小数结果，必须有浮点数（小数）参与运算。
    3. 浮点数直接运算可能得到不精确的结果（例如 `10.0 / 3` 在 Java 中近似输出 `3.3333333333333335`）。

- <span style="color:#60a5fa;font-weight:700;">`%`（取模/求余）的本质：做除法运算并获取余数。</span>
    - 判断奇偶：`num % 2 == 0` 为偶数，`num % 2 != 0` 为奇数；使用 `!= 0` 可兼容负奇数。

### 2、 万能数值拆分公式

<span style="background-color:rgba(96,165,250,.14);color:#60a5fa;font-weight:700;padding:2px 6px;border-radius:4px;">数位拆分口诀：整除 `/` 去掉末位，取模 `%` 保留末位。</span>

```java
public class SplitNumberDemo {
    public static void main(String[] args) {
        // 以三位数 number = 123 为例
        int number = 123;

        // 1、 万能数位拆分公式计算
        int ones = number % 10;           // 个位：对 10 取模 (123 % 10 = 3)
        int tens = number / 10 % 10;      // 十位：先除以 10 舍去个位，再对 10 取模 (12 % 10 = 2)
        int hundreds = number / 100 % 10; // 百位：先除以 100 舍去十位和个位，再对 10 取模 (1 % 10 = 1)

        // 2、 格式化控制台输出
        System.out.println("数值 " + number + " 的拆分结果为：");
        System.out.println("百位 (hundreds) 是：" + hundreds);
        System.out.println("十位 (tens)     是：" + tens);
        System.out.println("个位 (ones)     是：" + ones);
    }
}
```
- **控制台运行输出结果**：
```bash
数值 123 的拆分结果为：
百位 (hundreds) 是：1
十位 (tens)     是：2
个位 (ones)     是：3
```
  
## 四、自增自减与字符/字符串拼接

### 1、 自增自减运算符 (`++`、`--`)

- <span style="color:#60a5fa;font-weight:700;">核心特征：前自增 `++a` 和后自增 `a++` 单独成句时，都会让变量自身加 1。</span>

- <span style="background-color:rgba(251,191,36,.18);color:#f59e0b;font-weight:700;padding:2px 6px;border-radius:4px;">笔试高频：自增参与混合运算时，要区分“先用后加”和“先加后用”。</span>

- **`a++`（后自增）**：<span style="color:#f59e0b;font-weight:700;">先用后加</span>。先使用原值参与当前运算，再让变量自身加 1。

- **`++a`（前自增）**：<span style="color:#34d399;font-weight:700;">先加后用</span>。变量先加 1，再使用新值参与运算。


```java
int a = 10;
int b = a++; // b = 10, a = 11
int c = ++a; // a = 12, c = 12
```
### 2、 字符串的 `+` 操作

- **核心规则**：

1. 当 `+` 运算中出现字符串时，后续 `+` 会按字符串连接处理，并产生新字符串。
2. 连续 `+` 运算默认从左向右执行，括号可以改变计算顺序。

- **经典面试演练**：
	- `1 + "abc" + 1` $\rightarrow$ 结果：`"1abc1"`
	- `1 + 2 + "abc" + 2 + 1` $\rightarrow$ 结果：`"3abc21"`（前两个整数正常加法运算，随后转为拼接）
### 3、 字符的 `+` 操作

- <span style="color:#60a5fa;font-weight:700;">核心规则：`char` 参与算术运算时会提升为 `int`，使用其 Unicode 编码值参与计算。</span>
- <span style="background-color:rgba(251,191,36,.18);color:#f59e0b;font-weight:700;padding:2px 6px;border-radius:4px;">常见字符编码值：`'a' = 97`、`'A' = 65`、`'0' = 48`。</span>
```java
char c = 'a';
System.out.println(c + 0); // 输出 97
```
## 五、赋值与关系运算符 

### 1、 扩展赋值运算符 (`+=`、`-=`、`*=`、`/=`、`%=`)

- <span style="color:#f87171;font-weight:700;text-decoration:underline wavy #f87171;text-underline-offset:3px;">易错：扩展赋值运算符会隐式包含一次强制类型转换。</span>
    
    ```java
    byte a = 10;
    byte b = 20;
    // a = a + b; // 编译报错！a+b结果是int，无法赋值给byte
    a += b;       // 编译通过！底层等价于 a = (byte)(a + b);
    ```

- 关系运算符最终返回的结果一定是 <span style="color:#60a5fa;font-weight:700;">boolean（`true` 或 `false`）</span>。
- <span style="color:#f87171;font-weight:700;">避坑：`=` 表示赋值，`==` 才表示相等比较；引用类型的内容比较通常使用 `equals()`。</span>

## 六、逻辑与短路运算符

### 1、 基础逻辑运算符

- **`&` (逻辑与)**：且。两边全为真，结果才是真；只要有一个为假，结果即为假。
    
- **`|` (逻辑或)**：或。两边全为假，结果才是假；只要有一个为真，结果即为真。
    
- **`^` (逻辑异或)**：两边不同则为真，相同则为假（了解即可）。
    
- **`!` (逻辑非/取反)**：真变假，假变真。习惯上最多只用一个取反（`!flag`）。
    

### 2、 短路逻辑运算符 (`&&`、`||`)

- <span style="color:#60a5fa;font-weight:700;">短路机制：左侧表达式已经能决定最终结果时，右侧表达式不会执行。</span>
    
    - `&&` (短路与)：左边为 `false` 时发生短路，右边不执行（整体直接为 `false`）。
    - `||` (short-circuit or / 短路或)：左边为 `true` 时发生短路，右边不执行（整体直接为 `true`）。
        
- **实战价值**：
    
    1. **提升运行性能**：免去后续无意义的运算。
    2. <span style="color:#34d399;font-weight:700;">防范空指针异常：先检查对象不为 `null`，再访问其成员。</span>
```java
// 如果 str 为 null，不使用短路与，str.length() 将在运行时抛出空指针异常
if (str != null && str.length() > 0) {
	// 安全运行
}
```
## 七、三元运算符

- **格式**：$$\text{关系表达式} \ ? \ \text{表达式1} \ : \ \text{表达式2};$$
- **规则**：若关系表达式为真，执行表达式 1 并返回结果；若为假，执行表达式 2 并返回结果。
    
- <span style="color:#f87171;font-weight:700;">硬性要求：三元运算符产生的结果必须被使用，例如赋值、返回或直接输出。</span>
### 经典案例演练

- **练习 1：判断两只老虎体重是否相同**

```java
// 假定两只老虎体重通过录入获取为 weight1, weight2
String result = weight1 == weight2 ? "相同" : "不相同";
System.out.println(result);
```


- **练习 2：求三个数的最大值**
 
```java
// 记录三个和尚的身高
int height1 = 150, height2 = 210, height3 = 165;
// 先求前两个身高中的较大值，存储在临时变量 temp 中
int temp = height1 > height2 ? height1 : height2;
// 拿 temp 与第三个身高进行比较，求出最终最高身高
int max = temp > height3 ? temp : height3; // max = 210
```

## 八、运算符优先级

**核心法则：**

1. <span style="background-color:rgba(251,191,36,.18);color:#f59e0b;font-weight:700;padding:2px 6px;border-radius:4px;">小括号 `()` 的优先级最高。</span>
    
2. 实际开发中，无法立即确认优先级时，<span style="color:#34d399;font-weight:700;">直接使用小括号明确意图</span>，可同时避免错误并提高可读性。
