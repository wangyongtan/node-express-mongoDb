var mongoose = require('mongoose');
// var User = require('./../models/user.model');
var crypto = require('crypto'),
    User = require('../models/user.js')
    ,Post = require('../models/post.js');

var moment = require('moment');//时间控件
var formidable = require('formidable');//表单控件

module.exports = function(app) {
 app.get('/', function (req, res) {
  Post.get(null, function (err, posts) {
    if (err) {
      posts = [];
    } 
    res.render('index', {
      title: '主页',
      user: req.session.user,
      posts: posts,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

  app.get('/reg', checkNotLogin);
  app.get('/reg', function (req, res) {
    res.render('reg', {
      title: '注册',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

  app.post('/reg', checkNotLogin);
  app.post('/reg', function (req, res) {
    var name = req.body.name,
        password = req.body.password,
        password_re = req.body['password-repeat'];
    if (password_re != password) {
      req.flash('error', '两次输入的密码不一致!'); 
      return res.redirect('/reg');
    }
    var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');
    var newUser = new User({
        name: name,
        password: password,
        email: req.body.email
    });
    User.get(newUser.name, function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      if (user) {
        req.flash('error', '用户已存在!');
        return res.redirect('/reg');
      }
      newUser.save(function (err, user) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/reg');
        }
        req.session.user = user;
        req.flash('success', '注册成功!');
        res.redirect('/');
      });
    });
  });

  app.get('/login', checkNotLogin);
  app.get('/login', function (req, res) {
    res.render('login', {
      title: '登录',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    }); 
  });

  app.post('/login', checkNotLogin);
  app.post('/login', function (req, res) {
    var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');
    User.get(req.body.name, function (err, user) {
      if (!user) {
        req.flash('error', '用户不存在!'); 
        return res.redirect('/login');
      }
      if (user.password != password) {
        req.flash('error', '密码错误!'); 
        return res.redirect('/login');
      }
      //用户名密码都匹配后，将用户信息存入 session
          req.session.user = user;
          console.log(user.name);
          req.flash('success','登录成功');
          res.redirect('/');
    });
  });

  app.get('/post', checkLogin);
  app.get('/post', function (req, res) {
    res.render('post', {
      title: '发表',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });

app.post('/post', checkLogin);
app.post('/post', function (req, res) {
  var currentUser = req.session.user,
      post = new Post(currentUser.name, req.body.title, req.body.post);
  post.save(function (err) {
    if (err) {
      req.flash('error', err); 
      return res.redirect('/');
    }
    req.flash('success', '发布成功!');
    res.redirect('/');//发表成功跳转到主页
  });
});
//展示文章
    app.get('/detail',function(req,res,next){
        var id = req.query.id;
        if(id && id!=''){
            Post.update({"_id":id},{$inc:{"pv":1}},function(err){
                if(err){
                    console.log(err);
                    return res.redirect("back");
                };
                console.log("浏览数量+1");
            });

            Post.findById(id,function(err,data){
                if(err){
                    console.log(err);
                    req.flash('error','查看文章详细信息出错');
                    return res.redirect('/');
                }
                res.render('detail',{
                    title:'文章展示',
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString(),
                    post:data,
                    img:path.dirname(__dirname) + '/public/images/'+data.postImg
                })
            });
        }
    });
    //编辑文件
    app.get('/edit/:author/:title',checkLogin, function (req, res) {
        var id = req.query.id;
        Post.findById(id, function (err, data) {
            //console.log(data);
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            res.render('edit', {
                title: '编辑',
                post: data,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            });
        });
    });
     app.post("/edit/:author/:title",checkLogin,function(req,res,next){
        var post = {
            id:req.body.id,
            author:req.session.user,
            title:req.body.title,
            article:req.body.article
        };

        console.log(post);

        //markdow转格式文章
        post.article = markdown.toHTML(post.article);


        Post.update({"_id":post.id},{$set:{title:post.title,article:post.article}},function(err){
            if(err){
                console.log(err);
                return;
            }
            console.log("更新成功");
            res.redirect("/");
        });
    });
     //删除文件
    app.get('/delete',checkLogin,function(req,res){
        var id = req.query.id;
        console.log(id);
        if(id && id!=''){
            Post.findByIdAndRemove(id,function(err){
                if(err){
                    console.log(err);
                    req.flash("success","删除文章失败");
                    return req.redirect('/')
                }
                req.flash("success","删除文章成功");
                res.redirect('/');
            })
        }
    });

  app.get('/logout', checkLogin);
  app.get('/logout', function (req, res) {
    req.session.user = null;
    req.flash('success', '登出成功!');
    res.redirect('/');
  });

  function checkLogin(req, res, next) {
    if (!req.session.user) {
      req.flash('error', '未登录!'); 
      res.redirect('/login');
    }
    next();
  }

  function checkNotLogin(req, res, next) {
    if (req.session.user) {
      req.flash('error', '已登录!'); 
      res.redirect('back');
    }
    next();
  }
};

