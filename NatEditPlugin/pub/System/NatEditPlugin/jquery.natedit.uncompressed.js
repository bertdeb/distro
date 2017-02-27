/*
 * jQuery NatEdit plugin 
 *
 * Copyright (c) 2008-2017 Michael Daum http://michaeldaumconsulting.com
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 */

/*global FoswikiTiny:false, tinyMCE:false, StrikeOne:false, plupload:false */
(function($) {
"use strict";

/*****************************************************************************
 * class NatEditor
 */
$.NatEditor = function(txtarea, opts) {
  var self = this,
      $txtarea = $(txtarea);

  // build element specific options. 
  self.opts = $.extend({}, opts, $txtarea.data());
  self.txtarea = txtarea;
  self.id = foswiki.getUniqueID();
  self.form = $(txtarea.form);

  $.log("NATEDIT: opts=",self.opts);

  self.container = $txtarea.wrap('<div class="ui-natedit"></div>').parent();
  self.container.attr("id", self.id);
  self.container.data("natedit", self);


  if (self.opts.hidden || $txtarea.is(".foswikiHidden")) {
    // just init the shell, not any engine
    self.initGui();
    self.initForm();
  } else {
    // init shell and engine
    $txtarea.addClass("ui-widget");

    // disable autoMaxExpand and resizable if we are auto-resizing
    if (self.opts.autoResize) {
      self.opts.autoMaxExpand = false;
      self.opts.resizable = false;
    }

    self.createEngine().done(function() {
      self.initGui();

      if (self.opts.showToolbar) {
        self.initToolbar();
      }

      self.initForm();

      /* establish auto max expand */
      if (self.opts.autoMaxExpand) {
        $txtarea.addClass("ui-natedit-autoexpand");
        self.autoMaxExpand();

        // disabled height property in parent container
        $txtarea.parents(".jqTabContents:first").addClass("jqTabDisableMaxExpand").height("auto");
      }

      /* establish auto expand */
      if (self.opts.autoResize) {
        self.initAutoExpand();
        self.autoResize();
      }
    });
  }
};

/*************************************************************************
 * init the helper to auto-expand the textarea on content change
 */
$.NatEditor.prototype.initAutoExpand = function() {
  var self = this,
      $txtarea = $(self.txtarea),
      style;

  self.helper = $('<textarea tabindex="-1" class="ui-natedit-auto-expand-helper" />').appendTo(self.container);

  // get text styles and apply them to the helper
  style = {
    fontFamily: $txtarea.css('fontFamily') || '',
    fontSize: $txtarea.css('fontSize') || '',
    fontWeight: $txtarea.css('fontWeight') || '',
    fontStyle: $txtarea.css('fontStyle') || '',
    fontStretch: $txtarea.css('fontStretch') || '',
    fontVariant: $txtarea.css('fontVariant') || '',
    letterSpacing: $txtarea.css('letterSpacing') || '',
    textTransform: $txtarea.css('textTransform') || '',
    textIndent: $txtarea.css('textIndent') || '',
    wordSpacing: $txtarea.css('wordSpacing') || '',
    lineHeight: $txtarea.css('lineHeight') || '',
    padding: $txtarea.css('padding') || '',
    textWrap: 'unrestricted'
  };
  self.helper.css(style);

  // add event handler
  if ('onpropertychange' in self.txtarea) {
    if ('oninput' in self.txtarea) {
      // IE9
      $txtarea.on('input.natedit keyup.natedit', function() {
        self.autoResize();
      });
    } else {
      // IE7 / IE8
      $txtarea.on('propertychange.natedit', function(ev) {
        if (ev.propertyName === 'value') {
          self.autoResize();
        }
      });
    }
  } else {
    // Modern Browsers
    $txtarea.on('input.natedit', function() {
      self.autoResize();
    });
  }

  // listen to window resize
  $(window).on("resize.natedit", function() {
    self.autoResize();
  });

};

/*************************************************************************
 * init an engine
 */
$.NatEditor.prototype.createEngine = function(id) {
  var self = this, 
      url,
      dfd = $.Deferred();

  id = id || self.opts.engine || 'raw';

  // TODO: check for self.engine already defined and destroy it first
  
  if (typeof ($.NatEditor.engines[id]) === 'undefined') {
    url = self.opts.pubUrl+"/"+self.opts.systemWeb+"/NatEditPlugin/engine/"+id+"/engine.js";
    self.getScript(url).done(function() {
      $.NatEditor.engines[id].createEngine(self).then(function(engine) {
        self.engine = engine;
        dfd.resolve();
      });
    });
  } else {
    $.NatEditor.engines[id].createEngine(self).then(function(engine) {
      self.engine = engine;
      dfd.resolve();
    });
  }

  return dfd.promise();
};

/*************************************************************************
 * get a script from the backend 
 */
$.NatEditor.prototype.getScript = function(url) {
  var self = this,
      dfd = $.Deferred(),

  script = document.createElement('script');
  script.async = true;
  script.src = url;

  script.addEventListener('load', function() { 
    $.log("NATEDIT: loaded",url);
    dfd.resolve();
  }); 
  script.addEventListener('error', function() {
    dfd.reject('Error loading script '+url);
  });
  script.addEventListener('abort', function() { 
    dfd.reject('Script loading aborted.')
  });

  document.head.appendChild(script);

  return dfd.promise();
 
/*
  opts = $.extend( opts || {}, {
    dataType: "script",
    cache: true,
    url: url
  });
 
  return jQuery.ajax(opts);
*/
};

/*************************************************************************
 * init the gui
 */
$.NatEditor.prototype.initGui = function() {
  var self = this, 
      $txtarea = $(self.txtarea);

  /* flag enabled plugins */
  if (typeof(tinyMCE) !== 'undefined') {
    self.container.addClass("ui-natedit-wysiwyg-enabled");
  }
  if (foswiki.getPreference("NatEditPlugin").FarbtasticEnabled) {
    self.container.addClass("ui-natedit-colorpicker-enabled");
  }


  if (self.opts.resizable) {
    self.engine.getWrapperElement().resizable();
  }

  /* init the perms tab */
  function updateDetails(txtboxlst) {
    var currentValues = txtboxlst.currentValues,
      type = $(txtboxlst.input).data("permType");

    $.log("NATEDIT: currentValues="+currentValues.join(", "));
    self.setPermission(type, {
      allow: currentValues.join(", ")
    });
  }

  self.form.find(".ui-natedit-details-container input").on("blur", function() {
    var $this = $(this);
    $this.trigger("AddValue", $this.val());
  }).textboxlist({
    onSelect: updateDetails,
    onDeselect: updateDetails,
    onClear: updateDetails,
    onReset: updateDetails,
    autocomplete: self.opts.scriptUrl + "/view/" + self.opts.systemWeb + "/JQueryAjaxHelper?section=user;skin=text;contenttype=application/json"
  });

  function setPermissionSet(data) {
    if (data.perms === 'details') {
      self.showPermDetails(data.permType);
    } else {
      self.hidePermDetails(data.permType);
      self.setPermission(data.permType, data.perms);
    }
  }

  // behavior
  self.form.find(".ui-natedit-permissions-form input[type=radio]").on("click", function() {
    setPermissionSet($(this).data());
  });

  // init
  self.form.find(".ui-natedit-permissions-form input[type=radio]:checked").not(":disabled").each(function() {
    setPermissionSet($(this).data());
  });

  // DEPRECATED tinymce integration
  // SMELL:monkey patch FoswikiTiny
  if (typeof(FoswikiTiny) !== 'undefined') {
    self.origSwitchToRaw = FoswikiTiny.switchToRaw;

    FoswikiTiny.switchToRaw = function(inst) {
      self.tinyMCEInstance = inst;
      self.origSwitchToRaw(inst);
      self.showToolbar();
      $("#"+inst.id+"_2WYSIWYG").remove(); // SMELL: not required ... shouldn't create it in the first place
    };
  } else {
    $txtarea.removeClass("foswikiWysiwygEdit");
  }
};
/*************************************************************************
 * DEPRECATED tinymce integration
 */
$.NatEditor.prototype.switchToWYSIWYG = function(ev) {
  var self = this;

  if (typeof(self.tinyMCEInstance) !== 'undefined') {
    self.hideToolbar();
    tinyMCE.execCommand("mceToggleEditor", null, self.tinyMCEInstance.id);
    FoswikiTiny.switchToWYSIWYG(self.tinyMCEInstance);
  }
};

/*************************************************************************
 * init the toolbar
 */
$.NatEditor.prototype.initToolbar = function() {
  var self = this, 
      $txtarea = $(self.txtarea),
      url = self.opts.scriptUrl+"/rest/JQueryPlugin/tmpl?topic="+self.opts.web+"."+self.opts.topic+"&load="+self.opts.toolbar;

  // load toolbar
  $.loadTemplate({
    url:url
  }).done(function(tmpl) {

    // init it
    self.toolbar = $(tmpl.render({
      web: self.opts.web,
      topic: self.opts.topic
    }));

    self.container.prepend(self.toolbar);

    // buttonsets
    self.toolbar.find(".ui-natedit-buttons").buttonset({}).on("click", function(ev) {
      self.handleToolbarAction(ev, $(ev.target).closest("a:not(.ui-natedit-menu-button)"));
      return false;
    });

    // a simple button
    self.toolbar.find(".ui-natedit-button").button().on("click", function(ev) {
      self.handleToolbarAction(ev, $(this));
      return false;
    });

    // a button with a menu next to it
    self.toolbar.find(".ui-natedit-menu-button").not(".ui-button").button().end()
      .button("option", {
        icon: 'ui-icon-triangle-1-s',
        iconPosition: 'end'
      })
      .on("mousedown", function(ev) {
        var $this = $(this),
          $menu = (typeof($this.data("menu")) === 'undefined') ? $this.next() : $(self.container.find($this.data("menu"))),
          state = $menu.data("state") || false;

        $menu.data("menu-button", this);
        self.hideMenus();

        if (!state) {
          $this.addClass("ui-state-highlight");
          $menu.show().position({
            my: "left top",
            at: "left bottom+10",
            of: $this
          });
          $menu.data("state", true);
        } else {
          $this.removeClass("ui-state-highlight");
        }

        return false;
      }).on("click", function() {
        return false;
      });

    // markup menus
    self.toolbar.find(".ui-natedit-menu").each(function() {
      var $menu =
        $(this),
        timer,
        enableSelect = false;

      $menu.menu().on("mouseleave", function() {
        timer = window.setTimeout(function() {
          //$menu.hide().data("state", false);
        }, 1000);

      }).on("mouseenter", function() {
        if (typeof(timer) !== 'undefined') {
          window.clearTimeout(timer);
          timer = undefined;
        }
      }).on("menuselect", function(ev, ui) {
        ev.target = $menu.data("menu-button"); // SMELL: patch in menu button that triggered this event
        if (enableSelect) {
          self.hideMenus();
          self.handleToolbarAction(ev, ui.item.children("a:first"));
        }
      }).children().on("mouseup", function(ev) {
        enableSelect = true;
        $menu.menu("select", ev);
        enableSelect = false;
      }).on("click", function() {
        return false;
      });
    });

    // close menus clicking the container 
    $(self.container).on("click", function() {
      self.hideMenus();
    });

    // close menus clicking into the engine 
    self.engine.on("click", function() {
      self.hideMenus();
    });

    if (self.opts.autoHideToolbar) {
      //$.log("NATEDIT: toggling toolbar on hover event");
      self.toolbar.hide();

      self.engine.on("focus",
        function() {
          window.setTimeout(function() {
            self.showToolbar();
          });
        }
      ).on("blur",
        function() {
          window.setTimeout(function() {
            self.hideToolbar();
          });
        }
      );
    }

    // init gui of engine
    self.engine.initGui();

    // set trigger resize again as the toolbar changed its height
    $(window).trigger("resize");
  });
};

/*************************************************************************
  * show the toolbar, constructs it if it hasn't been initialized yet
  */
$.NatEditor.prototype.showToolbar = function() {
  var self = this, tmp;

  if (typeof(self.toolbar) === 'undefined') {
    self.initToolbar();
  }

  if (typeof(self.toolbar) === 'undefined') {
    return;
  }

  tmp = self.txtarea.value; 
  self.toolbar.show();
  self.txtarea.value = tmp;

  if (self.opts.autoMaxExpand) {
    $(window).trigger("resize");
  }
};

/*************************************************************************
  * hide the toolbar
  */
$.NatEditor.prototype.hideToolbar = function() {
  var self = this, tmp;

  if (!self.toolbar) {
    return;
  }

  tmp = self.txtarea.value;
  self.toolbar.hide();
  self.txtarea.value = tmp;

  if (self.opts.autoMaxExpand) {
    $(window).trigger("resize");
  }
};

/*************************************************************************
  * assert a specific permission rule
  */
$.NatEditor.prototype.setPermission = function(type, rules) {
  var self = this,
    key, val;

  self.form.find(".permset_" + type).each(function() {
    $(this).val("undefined");
  });

  for (key in rules) {
    if (rules.hasOwnProperty(key)) {
      val = rules[key];
      $.log("NATEDIT: setting ."+key+"_"+type+"="+val); 
      self.form.find("." + key + "_" + type).val(val);
    }
  }
};

/*************************************************************************
  * show the details ui on the permissions tab
  */
$.NatEditor.prototype.showPermDetails = function(type) {
  var self = this,
    names = [],
    val;

  self.form.find(".ui-natedit-"+type+"-perms .ui-natedit-details-container").slideDown(300);
  self.form.find("input[name='Local+PERMSET_" + type.toUpperCase() + "_DETAILS']").each(function() {
    val = $(this).val();
    if (val && val != '') {
      names.push(val);
    }
  });

  names = names.join(', ');
  $.log("NATEDIT: showPermDetails - names="+names);

  self.setPermission(type, {
    allow: names
  });
};

/*************************************************************************
  * hide the details ui on the permissions tab
  */
$.NatEditor.prototype.hidePermDetails = function(type) {
  var self = this;

  self.form.find(".ui-natedit-"+type+"-perms .ui-natedit-details-container").slideUp(300);
  self.setPermission(type);
};


/*************************************************************************
  * calls a notification systems, defaults to pnotify
  */
$.NatEditor.prototype.showMessage = function(type, msg, title) {
  var self =

  $.pnotify({
    title: title,
    text:msg,
    hide:(type === "error"?false:true),
    type:type,
    sticker:false,
    closer_hover:false,
    delay: (type === "error"?8000:1000)
  });
};

/*************************************************************************
  * hide all open error messages in the notification system
  */
$.NatEditor.prototype.hideMessages = function() {
  var self = this;

  $.pnotify_remove_all();
};

/*************************************************************************
  * hack to extract an error message from a foswiki non-json aware response :(
  */
$.NatEditor.prototype.extractErrorMessage = function(text) {
  var self = this;

  if (text && text.match(/^<!DOCTYPE/)) {
    text = $(text).find(".natErrorMessage").text().replace(/\s+/g, ' ').replace(/^\s+/, '') || '';
  }

  if (text === "error") {
    text = "Error: save failed. Please save your content locally and reload this page.";
  }

  return text;
};

/*************************************************************************
  * things to be done before the submit goes out
  */
$.NatEditor.prototype.beforeSubmit = function(editAction) {
  var self = this, topicParentField, actionValue;

  if (typeof(self.form) === 'undefined' || self.form.length === 0) {
    return;
  }

  topicParentField = self.form.find("input[name=topicparent]");
  actionValue = 'foobar';

  if (topicParentField.val() === "") {
    topicParentField.val("none"); // trick in unsetting the topic parent
  }

  if (editAction === 'addform') {
    self.form.find("input[name='submitChangeForm']").val(editAction);
  }

  // the action_... field must be set to a specific value in newer foswikis
  if (editAction === 'save') {
    actionValue = 'Save';
  } else if (editAction === 'cancel') {
    actionValue = 'Cancel';
  }

  self.form.find("input[name='action_preview']").val('');
  self.form.find("input[name='action_save']").val('');
  self.form.find("input[name='action_checkpoint']").val('');
  self.form.find("input[name='action_addform']").val('');
  self.form.find("input[name='action_replaceform']").val('');
  self.form.find("input[name='action_cancel']").val('');
  self.form.find("input[name='action_" + editAction + "']").val(actionValue);

  if (typeof(StrikeOne) !== 'undefined') {
    StrikeOne.submit(self.form[0]);
  }

  // DEPRECATED tinymce integration
  if (typeof(tinyMCE) !== 'undefined') {
    $.each(tinyMCE.editors, function(index, editor) { 
        if (typeof(editor.onSubmit) !== 'undefined') {
          editor.onSubmit.dispatch(); 
        }
    }); 
  }

  self.form.trigger("beforeSubmit.natedit", {
    editor: self, 
    action: editAction
  });
};

/*************************************************************************
 * init the form surrounding natedit 
 */
$.NatEditor.prototype.initForm = function() {
  var self = this, formRules;

  if (typeof(self.form) === 'undefined' || self.form.length === 0 || self.form.data("isInitialized")) {
    return;
  }

  self.form.data("isInitialized", true);

  /* remove the second TopicTitle */
  self.form.find("input[name='TopicTitle']:eq(1)").parents(".foswikiFormStep").remove();

  /* remove the second Summary */
  self.form.find("input[name='Summary']:eq(1)").parents(".foswikiFormStep").remove();

  /* save handler */
  self.form.find(".ui-natedit-save").on("click", function() {
    var $editCaptcha = $("#editcaptcha"),
      buttons,
      doIt = function() {
        if (self.form.validate().form()) {
          self.beforeSubmit("save");
          document.title = $.i18n("Saving ...");
          $.blockUI({
            message: '<h1> '+ $.i18n("Saving ...") + '</h1>'
          });
          self.form.submit();
        }
      };

    if ($editCaptcha.length) {
      buttons = $editCaptcha.dialog("option", "buttons");
      buttons[0].click = function() {
        if ($editCaptcha.find(".jqCaptcha").data("captcha").validate()) {
          $editCaptcha.dialog("close");
          doIt();
        }
      };
      $editCaptcha.dialog("option", "buttons", buttons).dialog("open");
    } else {
      doIt();
    }
    return false;
  });

  /* save & continue handler */
  self.form.find(".ui-natedit-checkpoint").on("click", function(ev) {
    var topicName = self.opts.topic,
      origTitle = document.title,
      $editCaptcha = $("#editcaptcha"),
      buttons,
      doIt = function() {
        var editAction = $(ev.currentTarget).attr("href").replace(/^#/, "");

        if (self.form.validate().form()) {
          self.beforeSubmit(editAction);

          if (topicName.match(/AUTOINC|XXXXXXXXXX/)) { 
            // don't ajax when we don't know the resultant URL (can change this if the server tells it to us..)
            self.form.submit();
          } else {
            self.form.ajaxSubmit({
              url: self.opts.scriptUrl + '/rest/NatEditPlugin/save', // SMELL: use this one for REST as long as the normal save can't cope with REST
              beforeSubmit: function() {
                self.hideMessages();
                document.title = $.i18n("Saving ...");
                $.blockUI({
                  message: '<h1>'+ $.i18n("Saving ...") + '</h1>'
                });
              },
              error: function(xhr, textStatus, errorThrown) {
                var message = self.extractErrorMessage(xhr.responseText || textStatus);
                self.showMessage("error", message);
              },
              complete: function(xhr, textStatus) {
                var nonce = xhr.getResponseHeader('X-Foswiki-Validation');
                if (nonce) {
                  // patch in new nonce
                  $("input[name='validation_key']").each(function() {
                    $(this).val("?" + nonce);
                  });
                }
                document.title = origTitle;
                $.unblockUI();
              }
            });
          }
        }
      };

    if ($editCaptcha.length) {
      buttons = $editCaptcha.dialog("option", "buttons");
      buttons[0].click = function() {
        if ($editCaptcha.find(".jqCaptcha").data("captcha").validate()) {
          $editCaptcha.dialog("close");
          doIt();
        }
      };
      $editCaptcha.dialog("option", "buttons", buttons).dialog("open");
    } else {
      doIt();
    }

    return false;
  });

  /* preview handler */
  self.form.find(".ui-natedit-preview").on("click", function() {

    if (self.form.validate().form()) {
      self.beforeSubmit("preview");

      self.form.ajaxSubmit({
        url: self.opts.scriptUrl + '/rest/NatEditPlugin/save', // SMELL: use this one for REST as long as the normal save can't cope with REST
        beforeSubmit: function() {
          self.hideMessages();
          $.blockUI({
            message: '<h1>'+$.i18n("Loading preview ...")+'</h1>'
          });
        },
        error: function(xhr, textStatus, errorThrown) {
          var message = self.extractErrorMessage(xhr.responseText || textStatus);
          $.unblockUI();
          self.showMessage("error", message);
        },
        success: function(data, textStatus) {
          var $window = $(window),
            height = Math.round(parseInt($window.height() * 0.6, 10)),
            width = Math.round(parseInt($window.width() * 0.6, 10));

          $.unblockUI();

          if (width < 640) {
            width = 640;
          }

          data = data.replace(/%width%/g, width).replace(/%height%/g, height);
          $("body").append(data);
        }
      });
    }
    return false;
  });


  // TODO: only use this for foswiki engines < 1.20
  self.form.find(".ui-natedit-cancel").on("click", function() {
    self.hideMessages();
    $("label.error").hide();
    $("input.error").removeClass("error");
    $(".jqTabGroup a.error").removeClass("error");
    self.beforeSubmit("cancel");
    self.form.submit();
    return false;
  });

  self.form.find(".ui-natedit-replaceform").on("click", function() {
    self.beforeSubmit("replaceform");
    self.form.submit();
    return false;
  });

  self.form.find(".ui-natedit-addform").on("click", function() {
    self.beforeSubmit("addform");
    self.form.submit();
    return false;
  });

  /* add clientside form validation */
  formRules = $.extend({}, self.form.metadata({
    type: 'attr',
    name: 'validate'
  }));

  self.form.validate({
    meta: "validate",
    ignore: ".foswikiIgnoreValidation",
    onsubmit: false,
    invalidHandler: function(e, validator) {
      var errors = validator.numberOfInvalids(),
        $form = $(validator.currentForm);

      if (errors) {
        $.unblockUI();
        self.showMessage("error", $.i18n('One or more fields have not been filled correctly'));
        $.each(validator.errorList, function() {
          var $errorElem = $(this.element);
          $errorElem.parents(".jqTab").each(function() {
            var id = $(this).attr("id");
            $("[data=" + id + "]").addClass("error");
          });
        });
      } else {
        self.hideMessages();
        $form.find(".jqTabGroup a.error").removeClass("error");
      }
    },
    rules: formRules,
    ignoreTitle: true,
    errorPlacement: function(error, element) {
      if (element.is("[type=checkbox],[type=radio]")) {
        // special placement if we are inside a table
        $("<td>").appendTo(element.parents("tr:first")).append(error);
      } else {
        // default
        error.insertAfter(element);
      }
    }
  });

  $.validator.addClassRules("foswikiMandatory", {
    required: true
  });

};

/*************************************************************************
 * handles selection of menu item or click of a button in the toolbar
 */
$.NatEditor.prototype.handleToolbarAction = function(ev, ui) {
  var self = this, 
      itemData, 
      dialogData,
      okayHandler = function() {},
      cancelHandler = function() {},
      openHandler = function() {},
      optsHandler = function() {
        return {
          web: self.opts.web,
          topic: self.opts.topic,
          selection: self.engine.getSelection()
        };
      };


  if (typeof(ui) === 'undefined' || ui.length === 0) {
    return;
  }

  // call engine on toolbar action
  itemData = self.engine.handleToolbarAction(ui);

  if (typeof(itemData) === 'undefined') {
    return;
  }

  //$.log("handleToolbarAction data=",itemData)

  // insert markup mode
  if (typeof(itemData.markup) !== 'undefined') {
    itemData.value = self.opts[itemData.markup];
  }

  // insert markup by value 
  if (typeof(itemData.value) !== 'undefined') {
    if (itemData.type === 'line') {
      self.engine.insertLineTag(itemData.value);
    } else {
      self.engine.insertTag(itemData.value);
    }
  }

  // dialog mode
  if (typeof(itemData.dialog) !== 'undefined') {

    if (typeof(itemData.okayHandler) !== 'undefined' && typeof(self[itemData.okayHandler]) === 'function') {
      okayHandler = self[itemData.okayHandler];
    }

    if (typeof(itemData.cancelHandler) !== 'undefined' && typeof(self[itemData.cancelHandler]) === 'function') {
      cancelHandler = self[itemData.cancelHandler];
    }

    if (typeof(itemData.openHandler) !== 'undefined' && typeof(self[itemData.openHandler]) === 'function') {
      openHandler = self[itemData.openHandler];
    }

    if (typeof(itemData.optsHandler) !== 'undefined' && typeof(self[itemData.optsHandler]) === 'function') {
      optsHandler = self[itemData.optsHandler];
    }

    dialogData = optsHandler.call(self);

    self.dialog({
      name: itemData.dialog,
      open: function(elem) {
        openHandler.call(self, elem, dialogData);
      },
      data: dialogData,
      event: ev,
      modal: itemData.modal,
      okayText: itemData.okayText,
      cancelText: itemData.cancelText
    }).then(function(dialog) {
        okayHandler.call(self, dialog);
      }, function(dialog) {
        cancelHandler.call(self, dialog);
      }
    );
  }

  // method mode 
  if (typeof(itemData.handler) !== 'undefined' && typeof(self[itemData.handler]) === 'function') {
    //$.log("found handler in toolbar action",itemData.handler);
    self[itemData.handler].call(self, ev, ui);
    return;
  }

  //$.log("NATEDIT: no action for ",ui);
};

/*************************************************************************
 * close all open menus
*/
$.NatEditor.prototype.hideMenus = function() {
  var self = this;

  self.container.find(".ui-natedit-menu").each(function() {
    var $this = $(this),
        $button = $($this.data("menu-button"));

    $button.removeClass("ui-state-highlight");
    $this.hide().data("state", false);
  });
};

/***************************************************************************
 * insert a square brackets link
 * opts is a hash of params that can have either of two forms:
 *
 * insert a link to a topic:
 * {
 *   web: "TheWeb",
 *   topic: "TheTopic",
 *   text: "the link text" (optional)
 * }
 *
 * insert an external link:
 * {
 *   url: "http://...",
 *   text: "the link text" (optional)
 * }
 *
 * insert an attachment link:
 * {
 *   web: "TheWeb",
 *   topic: "TheTopic",
 *   file: "TheAttachment.jpg",
 *   text: "the link text" (optional)
 * }
 */
$.NatEditor.prototype.insertLink = function(opts) {
  var self = this, markup;

  if (typeof(opts.url) !== 'undefined') {
    // external link
    if (typeof(opts.url) === 'undefined' || opts.url == '') {
      return; // nop
    }

    if (typeof(opts.text) !== 'undefined' && opts.text != '') {
      markup = "[["+opts.url+"]["+opts.text+"]]";
    } else {
      markup = "[["+opts.url+"]]";
    }
  } else if (typeof(opts.file) !== 'undefined') {
    // attachment link

    if (typeof(opts.web) === 'undefined' || opts.web == '' || 
        typeof(opts.topic) === 'undefined' || opts.topic == '') {
      return; // nop
    }

    if (opts.file.match(/\.(bmp|png|jpe?g|gif|svg)$/i) && foswiki.getPreference("NatEditPlugin").ImagePluginEnabled) {
      markup = '%IMAGE{"'+opts.file+'"';
      if (opts.web != self.opts.web || opts.topic != self.opts.topic) {
        markup += ' topic="';
        if (opts.web != self.opts.web) {
          markup += opts.web+'.';
        }
        markup += opts.topic+'"';
      }
      if (typeof(opts.text) !== 'undefined' && opts.text != '') {
        markup += ' caption="'+opts.text+'"';
      }
      markup += ' size="320"}%';
    } else {
      // linking to an ordinary attachment

      if (opts.web == self.opts.web && opts.topic == self.opts.topic) {
        markup = "[[%ATTACHURLPATH%/"+opts.file+"]";
      } else {
        markup = "[[%PUBURLPATH%/"+opts.web+"/"+opts.topic+"/"+opts.file+"]";
      }

      if (typeof(opts.text) !== 'undefined' && opts.text != '') {
        markup += "["+opts.text+"]";
      } else {
        markup += "["+opts.file+"]";
      }
      markup += "]";
    }

  } else {
    // wiki link
    
    if (typeof(opts.topic) === 'undefined' || opts.topic == '') {
      return; // nop
    }

    if (opts.web == self.opts.web) {
      markup = "[["+opts.topic+"]";
    } else {
      markup = "[["+opts.web+"."+opts.topic+"]";
    }

    if (typeof(opts.text) !== 'undefined' && opts.text != '') {
      markup += "["+opts.text+"]";
    } 
    markup += "]";
  }
  self.engine.remove();
  self.engine.insertTag(['', markup, '']);
};

/*************************************************************************
 * set the value of the editor
 */
$.NatEditor.prototype.setValue = function(val) {
  var self = this;

  self.engine.setValue(val);
};

/*****************************************************************************
 * handler for escape tml 
 */
$.NatEditor.prototype.handleEscapeTML = function(ev, elem) {
  var self = this, 
      selection = self.engine.getSelection() || '';

  selection = self.escapeTML(selection);

  self.engine.remove();
  self.engine.insertTag(['', selection, '']);
};

/*****************************************************************************
 * handler for unescape tml 
 */
$.NatEditor.prototype.handleUnescapeTML = function(ev, elem) {
  var self = this, 
      selection = self.engine.getSelection() || '';

  selection = self.unescapeTML(selection);

  self.engine.remove();
  self.engine.insertTag(['', selection, '']);
};


/*************************************************************************
 * Replaces all foswiki TML special characters with their escaped counterparts.
 * See Foswiki:System.FormatTokens
 * @param inValue: (String) the text to escape
 * @return escaped text.
 */
$.NatEditor.prototype.escapeTML = function(inValue) {
  var text = inValue;

  text = text.replace(/\$/g, '$dollar');
  text = text.replace(/%/g, '$percnt');
  text = text.replace(/"/g, '\\"');

// SMELL: below aren't supported by all plugins; they don't play a role in TML parsing anyway

//  text = text.replace(/&/g, '$amp');
//  text = text.replace(/>/g, '$gt');
//  text = text.replace(/</g, '$lt');
//  text = text.replace(/,/g, '$comma');

  return text;
};

/*************************************************************************
 * The inverse of the escapeTML function.
 * See Foswiki:System.FormatTokens
 * @param inValue: (String) the text to unescape.
 * @return unescaped text.
 */
$.NatEditor.prototype.unescapeTML = function(inValue) {
  var text = inValue;

  text = text.replace(/\$nop/g, '');
  text = text.replace(/\\"/g, '"');
  text = text.replace(/\$perce?nt/g, '%');
  text = text.replace(/\$quot/g, '"');
  text = text.replace(/\$comma/g, ',');
  text = text.replace(/\$lt/g, '<');
  text = text.replace(/\$gt/g, '>');
  text = text.replace(/\$amp/g, '&');
  text = text.replace(/\$dollar/g, '$');

  return text;
};

/*************************************************************************
 * event handler for window.resize event 
 */
$.NatEditor.prototype.autoMaxExpand = function() {
  var self = this;

  self.fixHeight();
  $(window).one("resize.natedit", function() {
    self.autoMaxExpand();
  });
};

/*************************************************************************
 * adjust height of textarea to window height
 */
$.NatEditor.prototype.fixHeight = function() {
  var self = this,
    elem = self.engine.getWrapperElement(),
    windowHeight = $(window).height() || window.innerHeight,
    tmceEdContainer = (typeof(tinyMCE) !== 'undefined' && tinyMCE.activeEditor)?$(tinyMCE.activeEditor.contentAreaContainer):null, // DEPRECATED tinymce integration
    newHeight,
    $debug = $("#DEBUG");

  // DEPRECATED tinymce integration
  if (tmceEdContainer && !tinyMCE.activeEditor.getParam('fullscreen_is_enabled') && tmceEdContainer.is(":visible")) {
    /* resize tinyMCE. */
    tmceEdContainer.closest(".mceLayout").height('auto'); // remove local height properties
    elem = tmceEdContainer.children('iframe');
  } 

  if (!elem) {
    return;
  }

  if (typeof(self.bottomHeight) === 'undefined') {
    self.bottomHeight = $('.natEditBottomBar').outerHeight(true) + parseInt($('.jqTabContents').css('padding-bottom'), 10) * 2 + 2; 
  }

  newHeight = windowHeight - elem.offset().top - self.bottomHeight - parseInt(elem.css('padding-bottom'), 10) *2 - 2;

  if ($debug.length) {
    newHeight -= $debug.height();
  }

  if (self.opts.minHeight && newHeight < self.opts.minHeight) {
    newHeight = self.opts.minHeight;
  }

  if (newHeight < 0) {
    return;
  }

  if (elem.is(":visible")) {
    //console.log("NATEDIT: fixHeight height=",newHeight);
    // DEPRECATED tinymce integration
    if (tmceEdContainer) {
      elem.height(newHeight);
    } else {
      self.engine.setSize(undefined, newHeight);
    }
  } else {
    //console.log("NATEDIT: not fixHeight elem not yet visible");
  }
};

/*************************************************************************
 * adjust height of textarea according to content
 */
$.NatEditor.prototype.autoResize = function() {
  var self = this, 
      $txtarea = $(self.txtarea),
      now, text, height;

  //$.log("NATEDIT: called autoResize()");
  now = new Date();
  
  // don't do it too often
  if (self._time && now.getTime() - self._time.getTime() < 100) {
    //$.log("NATEDIT: suppressing events within 100ms");
    return;
  }
  self._time = now;

  window.setTimeout(function() {
    var oldHeight = Math.round($txtarea.height());
    text = $txtarea.val() + " ";

    if (text == self._lastText) {
      //$.log("NATEDIT: suppressing events");
      return;
    }

    self._lastText = text;
    text = self.htmlEntities(text);

    //$.log("NATEDIT: helper text="+text);
    self.helper.width($txtarea.width()).val(text);

    //height = self.helper.height() + 12;
    self.helper.scrollTop(9e4);
    height = self.helper.scrollTop();

    if (self.opts.minHeight && height < self.opts.minHeight) {
      height = self.opts.minHeight;
    } 

    if (self.opts.maxHeight && height > self.opts.maxHeight) {
      height = self.opts.maxHeight;
      $txtarea.css('overflow-y', 'scroll');
    } else {
      $txtarea.css('overflow-y', 'hidden');
    }

    height = Math.round(height);

    if (oldHeight !== height) {
      //$.log("NATEDIT: setting height=",height);

      $txtarea.height(height);
      $txtarea.trigger("resize");
    }
  });
};

/*************************************************************************
 * replace entities with real html
 */
$.NatEditor.prototype.htmlEntities = function(text) { 
  var entities = {
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;'
  }, i;

  for(i in entities) {
    if (entities.hasOwnProperty(i)) {
      text = text.replace(new RegExp(i,'g'),entities[i]);
    }
  }
  return text;
};

/*****************************************************************************
 * pre-load dialog, so that actually calling it later is fastr
 */
$.NatEditor.prototype.preloadDialog = function(name) {
  var self = this,
      url;

  url = foswiki.getScriptUrl("rest", "JQueryPlugin", "tmpl", {
    topic: self.opts.web+"."+self.opts.topic,
    load: "editdialog",
    name: name
  });
 
  return $.loadTemplate({
    url:url,
    name:name
  });
};

/*****************************************************************************
 * opens a dialog based on a jquery template
 */
$.NatEditor.prototype.dialog = function(opts) {
  var self = this,
    defaults = {
      url: undefined,
      title: $.i18n("Confirmation required"),
      okayText: $.i18n("OK"),
      okayIcon: "ui-icon-check",
      cancelText: $.i18n("Cancel"),
      cancelIcon: "ui-icon-cancel",
      width: 'auto',
      modal: true,
      position: {
        my:'center', 
        at:'center',
        of: window
      },
      open: function() {},
      data: {
        web: self.opts.web,
        topic: self.opts.topic,
        selection: self.engine.getSelection()
      }
    };

  if (typeof(opts) === 'string') {
    opts = {
      data: {
        text: opts
      }
    };
  }

  if (typeof(opts.url) === 'undefined' && typeof(opts.name) !== 'undefined') {
    opts.url = foswiki.getScriptUrl("rest", "JQueryPlugin", "tmpl", {
      topic: self.opts.web+"."+self.opts.topic,
      load: "editdialog",
      name: opts.name
    });
  }

  opts = $.extend({}, defaults, opts);

  if (typeof(opts.event) !== 'undefined') {
    opts.position = {
      my: 'center top',
      at: 'left bottom+30',
      of: opts.event.target
    };
  }

  self.hideMessages();
  return $.Deferred(function(dfd) {
    $.loadTemplate({
      url:opts.url,
      name:opts.name
    }).then(function(tmpl) {
      $(tmpl.render(opts.data)).dialog({
        buttons: [{
          text: opts.okayText,
          icon: opts.okayIcon,
          click: function() {
            $(this).dialog("close");
            dfd.resolve(this);
            return true;
          }
        }, {
          text: opts.cancelText,
          icon: opts.cancelIcon,
          click: function() {
            $(this).dialog("close");
            dfd.reject();
            return false;
          }
        }],
        open: function(ev) {
          var $this = $(this), 
              title = $this.data("title");

          if (typeof(title) !== 'undefined') {
            $this.dialog("option", "title", title);
          }

          $this.find("input").on("keydown", function(ev) {
            var $input = $(this);
            if (!$input.is(".ui-autocomplete-input") || !$input.data("ui-autocomplete").menu.element.is(":visible")) {
              if (ev.keyCode == 13) {
                ev.preventDefault();
                $this.dialog("close");
              }
            }
          });

          opts.open.call(self, this, opts.data);
        },
        close: function(event, ui) {
          dfd.resolve(this);
          $(this).remove();
        },
        show: 'fade',
        modal: opts.modal,
        draggable: true,
        resizable: false,
        title: opts.title,
        width: opts.width,
        position: opts.position
      });
    }, function(xhr) {
      self.showMessage("error", xhr.responseText);
    });
  }).promise();
};

/*****************************************************************************
 * handler for the search&replace dialog
 */
$.NatEditor.prototype.handleSearchReplace = function(elem) {
  var self = this,
      $dialog = $(elem),
      search = $dialog.find("input[name='search']").val(),
      replace = $dialog.find("input[name='replace']").val(),
      ignoreCase = $dialog.find("input[name='ignorecase']:checked").length?true:false,
      count;

  $.log("NATEDIT: handleSearchReplace, search='"+search+" 'replace='"+replace+"' ignoreCase=",ignoreCase);

  if (search.length) {
    count = self.engine.searchReplace(search, replace, ignoreCase);
    if (count) {
      self.showMessage("info", $.i18n("replaced '%count%' time(s)", {count: count}));
    } else {
      self.showMessage("warning", $.i18n("search string '%search%' not found", {search: search}));
    }
  }
};

/*****************************************************************************
 * handler for the insert table dialog
 */
$.NatEditor.prototype.handleInsertTable = function(elem) {
  var self = this,
    $dialog = $(elem),
    rows = $dialog.find("input[name='rows']").val(),
    cols = $dialog.find("input[name='cols']").val(),
    heads = $dialog.find("input[name='heads']").val(),
    editable = $dialog.find("input[name='editable']:checked").val() === 'true' ? true : false;

  return self.engine.insertTable({
    heads: heads,
    rows: rows,
    cols: cols,
    editable: editable
  });
};

/*****************************************************************************
  * handler for the insert link dialog
  */
$.NatEditor.prototype.handleInsertLink = function(elem) {
  var self = this,
    $dialog = $(elem),
    opts = {},
    $currentTab = $dialog.find(".jqTab.current");
 
  //$.log("called openInsertTable()", $dialog);

  if ($currentTab.is(".topic")) {
    opts = {
      web: $currentTab.find("input[name='web']").val(),
      topic: $currentTab.find("input[name='topic']").val(),
      text: $dialog.find("input[name='linktext_topic']").val()
    };
  } else if ($currentTab.is(".external")) {
    opts = {
      url: $currentTab.find("input[name='url']").val(),
      text: $dialog.find("input[name='linktext_external']").val()
    };
  } else {
    return;
  }

  //$.log("opts=",opts);
  return self.insertLink(opts);
};

/*****************************************************************************
  * handler for the insert attachment dialog
  */
$.NatEditor.prototype.handleInsertAttachment = function(elem) {
  var self = this, $dialog = $(elem);
 
  return self.insertLink({
    web: $dialog.find("input[name='web']").val(),
    topic: $dialog.find("input[name='topic']").val(),
    file: $dialog.find("input[name='file']").val(),
    text: $dialog.find("input[name='linktext_attachment']").val()
  });
};

/*****************************************************************************
 * init the color dialog
 */
$.NatEditor.prototype.initColorDialog = function(elem, data) {
  var self = this,
      $dialog = $(elem),
      color = self.engine.getSelection(),
      inputField = $dialog.find("input[name='color']")[0];

  self.fb = $.farbtastic($dialog.find(".ui-natedit-colorpicker")).setColor("#fafafa").linkTo(inputField);

  return false;
};

/*****************************************************************************
 * parse selection for color code
 */
$.NatEditor.prototype.parseColorSelection = function() {
  var self = this,
      selection = self.engine.getSelection() || '#ff0000';

  return {
    web: self.opts.web,
    topic: self.opts.topic,
    selection: selection
  };
};

/*****************************************************************************
 * init the date dialog
 */
$.NatEditor.prototype.openDatePicker = function(ev, ui) {
  var self = this,
      elem,
      date,
      selection = self.engine.getSelection();

  if (selection === '') {
    date = new Date();
  } else {
    try {
      date = new Date(selection)
    } catch (e) {
      self.showMessage("error", $.i18n("invalid date '%date%'", {date:selection}));
    };
  }

  if (typeof(self.datePicker) === 'undefined') {
      elem = $('<div class="ui-natedit-datepicker"/>').css("position", "absolute").appendTo(self.container).hide();

    self.overlay = $("<div>")
      .addClass("ui-widget-overlay ui-front")
      .hide()
      .appendTo(self.container)
      .on("click", function() {
        self.datePicker.hide();
        self.overlay.hide();
      });

    self.datePicker = elem.datepicker({
        onSelect: function() {
         var date = self.datePicker.datepicker("getDate");
          self.datePicker.hide();
          self.overlay.hide();
          self.engine.remove();
          self.engine.insertTag(['', self.formatDate(date), '']);
        }
    }).draggable({handle:'.ui-widget-header'}).zIndex(self.overlay.zIndex()+1);

  }

  self.overlay.show();
  self.datePicker.datepicker("setDate", date);
    
  self.datePicker.show().focus().position({my:'center', at:'center', of:window});

  return false;
};

/*****************************************************************************
 * format a date the foswiki way
 */
$.NatEditor.prototype.formatDate = function(date) {
  var self = this,

  // TODO: make it smarter
  date = date.toDateString().split(/ /);
  return date[2]+' '+date[1]+' '+date[3];
};

/*****************************************************************************
 * inserts the color code
 */
$.NatEditor.prototype.handleInsertColor = function(elem) {
  var self = this, 
      color = self.fb.color;

  self.engine.remove();
  self.engine.insertTag(['', color, '']);
};

/*************************************************************************/
$.NatEditor.prototype.handleUndo = function(elem) {
  var self = this;

  self.engine.undo();
};

/*************************************************************************/
$.NatEditor.prototype.handleRedo = function(elem) {
  var self = this;

  self.engine.redo();
};

/*****************************************************************************
 * sort selection 
 */
$.NatEditor.prototype.handleSortAscending = function(ev, elem) {
  var self = this;
  self.sortSelection("asc");
};

$.NatEditor.prototype.handleSortDescending = function(ev, elem) {
  var self = this;
  self.sortSelection("desc");
};

$.NatEditor.prototype.sortSelection = function(dir) {
  var self = this,
    selection, lines, ignored, isNumeric = true, value,
    line, prefix, i, beforeSelection = "", afterSelection = "";

  //$.log("NATEDIT: sortSelection ", dir);

  selection = self.engine.getSelectionLines().split(/\r?\n/);

  lines = [];
  ignored = [];
  for (i = 0; i < selection.length; i++) {
    line = selection[i];
    // SMELL: sorting lists needs a real list parser
    if (line.match(/^((?: {3})+(?:[AaIi]\.|\d\.?|\*) | *\|)(.*)$/)) {
      prefix = RegExp.$1;
      line = RegExp.$2;
    } else {
      prefix = "";
    }

    value = parseFloat(line);
    if (isNaN(value)) {
      isNumeric = false;
      value = line;
    }

    if (line.match(/^\s*$/)) {
      ignored.push({
        pos: i,
        prefix: prefix,
        value: value,
        line: line
      });
    } else {
      lines.push({
        pos: i,
        prefix: prefix,
        line: line,
        value: value
      });
    }
  }

  $.log("NATEDIT: isNumeric=",isNumeric);
  $.log("NATEDIT: sorting lines",lines);

  lines = lines.sort(function(a, b) {
    var valA = a.value, valB = b.value;

    if (isNumeric) {
      return valA - valB;
    } else {
      return valA < valB ? -1 : valA > valB ? 1: 0;
    }
  });

  if (dir == "desc") {
    lines = lines.reverse();
  }

  $.map(ignored, function(item) {
    lines.splice(item.pos, 0, item);
  });

  selection = [];
  $.map(lines, function(item) {
    selection.push(item.prefix+item.line);
  });
  selection = selection.join("\n");

  $.log("NATEDIT: result=\n'"+selection+"'");

  self.engine.remove();
  self.engine.insertTag(['', selection, '']);
};

/*****************************************************************************
  * init the link dialog 
  */
$.NatEditor.prototype.initLinkDialog = function(elem, data) {
  var self = this,
      $dialog = $(elem), tabId,
      xhr, requestIndex = 0,
      $thumbnail = $dialog.find(".ui-natedit-attachment-thumbnail"),
      $container = $dialog.find(".jqTab.current");

  if ($container.length === 0) {
    $container = $dialog;
  }

  $dialog.find("input[name='web']").each(function() {
    $(this).autocomplete({
      source: self.opts.scriptUrl+"/view/"+self.opts.systemWeb+"/JQueryAjaxHelper?section=web&skin=text&contenttype=application/json"
    });
  });

  $dialog.find("input[name='topic']").each(function() {
      $(this).autocomplete({
      source: function(request, response) {
        var baseWeb = $container.find("input[name='web']").val();
        if (xhr) {
          xhr.abort();
        }
        xhr = $.ajax({
          url: self.opts.scriptUrl+"/view/"+self.opts.systemWeb+"/JQueryAjaxHelper",
          data: $.extend(request, {
            section: 'topic',
            skin: 'text',
            contenttype: 'application/json',
            baseweb: baseWeb
          }),
          dataType: "json",
          autocompleteRequest: ++requestIndex,
          success: function(data, status) {
            if (this.autocompleteRequest === requestIndex) {
              $.each(data, function(index, item) {
                item.value = item.value.replace(baseWeb+".", "");
              });
              response(data);
            }
          },
          error: function(xhr, status) {
            if (this.autocompleteRequest === requestIndex) {
              response([]);
            }
          }
        });
      }
    });
  });

  // attachments autocomplete ... TODO: rename css class
  $dialog.find(".natEditAttachmentSelector").each(function() {
    $(this).autocomplete({
      source: function(request, response) {

        if (xhr) {
          xhr.abort();
        }
        xhr = $.ajax({
          url: self.opts.scriptUrl+"/rest/NatEditPlugin/attachments",
          data: $.extend(request, {
            topic: $container.find("input[name='web']").val()+'.'+$container.find("input[name='topic']").val()
          }),
          dataType: "json",
          autocompleteRequest: ++requestIndex,
          success: function(data, status) {
            if (this.autocompleteRequest === requestIndex) {
              response(data);
            }
          },
          error: function(xhr, status) {
            if (this.autocompleteRequest === requestIndex) {
              response([]);
            }
          }
        });
      },
      select: function(ev, ui) {
        if ($thumbnail.length) {
          $thumbnail.attr("src", ui.item.img).show();
        }
      },
      change: function(ev, ui) {
        if ($thumbnail.length) {
          if (ui.item) {
            $thumbnail.attr("src", ui.item.img).show();
          } else {
            $thumbnail.hide();
          }
        }
      }
    }).data("ui-autocomplete")._renderItem = function(ul, item) {
      if (typeof(item.label) !== "undefined") {
        return $("<li></li>")
          .data("item.autocomplete", item)
          .append("<a><table width='100%'><tr>"+(typeof(item.img) !== 'undefined' ? "<td width='60px'><img width='50' src='"+item.img+"' /></td>":"")+"<td>"+item.label+"<br />"+item.comment+"</td></tr></table></a>")
          .appendTo(ul);
      }
    };
  });
  

  if (typeof(data.type) !== 'undefined') {
    tabId = $dialog.find(".jqTab."+data.type).attr("id");
    if (typeof(tabId) !== 'undefined') {
      window.setTimeout(function() {
        window.location.hash = "!" + tabId;
      });
    }
  }
};

/*****************************************************************************
  * init the attachments dialog 
  */
$.NatEditor.prototype.initAttachmentsDialog = function(elem, data) {
  var self = this,
      $dialog = $(elem);

  $.log("NATEDIT: initAttachmentsDialog on elem=",elem);

  self.initLinkDialog(elem, data);

  $dialog.on("dialogclose", function() {
    self.hideMessages();
  });

  // only execute below with jQuery-File-Upload available, part of TopicInteractionPlugin
  $dialog.find(".ui-natedit-uploader").each(function() {
    var $input = $dialog.find("input[name='file']"),
        $uploadButton = $dialog.find(".ui-natedit-uploader-button");

    $uploadButton.fileUploadButton();

    $uploadButton.bind("fileuploadstart", function() {
      //console.log("started upload");
      $input.attr("disabled", "disabled").val($.i18n("uploading ..."));
      self.hideMessages();
    });

    $uploadButton.bind("fileuploaddone", function(e, data) {
      //console.log("done upload");
      var file = data.files[0].name;
      $input.removeAttr("disabled").val(file).focus();
    });

    $uploadButton.bind("fileuploadfail", function(e, data) {
      //console.log("processfaiul upload");
      self.showMessage("error", $.i18n("Error during upload"));
    });
  });
};

/*****************************************************************************
  * cancel the attachments dialog; abords any upload in progress
  */
$.NatEditor.prototype.cancelAttachmentsDialog = function(elem, data) {
  var self = this,
      $dialog = $(elem);

  $.log("NATEDIT: cancelAttachmentsDialog on elem=",elem);

  if (typeof(self.uploader) !== 'undefined') {
    $.log("stopping uploader");
    //self.uploader.trigger("Stop");
  } else {
    $.log("no uploader found");
  }
};

/*****************************************************************************
 * parse the current selection and return the data to be used generating the tmpl
 */
$.NatEditor.prototype.parseLinkSelection = function() {
  var self = this,
      selection = self.engine.getSelection(),
      web = self.opts.web,
      topic = self.opts.topic,
      file = '',
      url = '',
      type = 'topic',
      urlRegExp = "(?:file|ftp|gopher|https?|irc|mailto|news|nntp|telnet|webdav|sip|edit)://[^\\s]+?";

  // initialize from selection
  if (selection.match(/\s*\[\[(.*?)\]\]\s*/)) {
    selection = RegExp.$1;
    //$.log("brackets link, selection=",selection);
    if (selection.match("^("+urlRegExp+")(?:\\]\\[(.*))?$")) {
      //$.log("external link");
      url = RegExp.$1;
      selection = RegExp.$2 || '';
      type = 'external';
    } else if (selection.match(/^(?:%ATTACHURL(?:PATH)?%\/)(.*?)(?:\]\[(.*))?$/)) {
      //$.log("this attachment link");     
      file = RegExp.$1;
      selection = RegExp.$2;
      type = "attachment";
    } else if (selection.match(/^(?:%PUBURL(?:PATH)?%\/)(.*)\/(.*?)\/(.*?)(?:\]\[(.*))?$/)) {
      //$.log("other topic attachment link");     
      web = RegExp.$1;
      topic = RegExp.$2;
      file = RegExp.$3;
      selection = RegExp.$4;
      type = "attachment";
    } else if (selection.match(/^(?:(.*)\.)?(.*?)(?:\]\[(.*))?$/)) {
      //$.log("topic link");
      web = RegExp.$1 || web;
      topic = RegExp.$2;
      selection = RegExp.$3 || '';
    } else {
      //$.log("some link");
      topic = selection;
      selection = '';
    }
  } else if (selection.match("^ *"+urlRegExp)) {
    //$.log("no brackets external link");
    url = selection;
    selection = "";
    type = "external";
  } else if (selection.match(/^\s*%IMAGE\{"(.*?)"(?:.*?topic="(?:([^\s\.]+)\.)?(.*?)")?.*?\}%\s*$/)) {
    // SMELL: nukes custom params
    //$.log("image link");
    web = RegExp.$2 || web;
    topic = RegExp.$3 || topic;
    file = RegExp.$1;
    selection = "";
    type = "attachment";
  } else {
    if (selection.match(/^\s*([A-Z][^\s\.]*)\.(A-Z.*?)\s*$/)) {
      //$.log("topic link");
      web = RegExp.$1 || web;
      topic = RegExp.$2;
      selection = '';
      type = "topic";
    } else {
      //$.log("some selection, not a link");
    }
  }
  //$.log("after: selection=",selection, ", url=",url, ", web=",web,", topic=",topic,", file=",file,", initialTab=", initialTab);
  //
  return {
    selection: selection,
    web: web,
    topic: topic,
    file: file,
    url: url,
    type: type
  };
};

/***************************************************************************
 * plugin defaults
 */
$.NatEditor.defaults = {

  // toolbar template
  toolbar: "edittoolbar",

  // Elements 0 and 2 are (respectively) prepended and appended.  Element 1 is the default text to use,
  // if no text is currently selected.

  h1Markup: ['---+!! ','%TOPIC%',''],
  h2Markup: ['---++ ','Headline text',''],
  h3Markup: ['---+++ ','Headline text',''],
  h4Markup: ['---++++ ','Headline text',''],
  h5Markup: ['---+++++ ','Headline text',''],
  h6Markup: ['---++++++ ','Headline text',''],
  verbatimMarkup: ['<verbatim>\n','Insert non-formatted text here','\n</verbatim>'],
  quoteMarkup: ['<blockquote>\n','Insert quote here','\n</blockquote>'],
  boldMarkup: ['*', 'Bold text', '*'],
  italicMarkup: ['_', 'Italic text', '_'],
  monoMarkup: ['=', 'Monospace text', '='],
  underlineMarkup: ['<u>', 'Underlined text', '</u>'],
  strikeMarkup: ['<del>', 'Strike through text', '</del>'],
  superscriptMarkup: ['<sup>', 'superscript text', '</sup>'],
  subscriptMarkup: ['<sub>', 'subscript text', '</sub>'],
  leftMarkup: ['<p style="text-align:left">\n','Align left','\n</p>'],
  centerMarkup: ['<p style="text-align:center">\n','Center text','\n</p>'],
  rightMarkup: ['<p style="text-align:right">\n','Align right','\n</p>'],
  justifyMarkup: ['<p style="text-align:justify">\n','Justify text','\n</p>'],
  numberedListMarkup: ['   1 ','enumerated item',''],
  bulletListMarkup: ['   * ','bullet item',''],
  indentMarkup: ['   ','',''],
  outdentMarkup: ['','',''],
  mathMarkup: ['<latex title="Example">\n','\\sum_{x=1}^{n}\\frac{1}{x}','\n</latex>'],
  signatureMarkup: ['-- ', '[[%WIKINAME%]], ' - '%DATE%'],
  dataFormMarkup: ['', '| *Name*  | *Type* | *Size* | *Values* | *Description* | *Attributes* | *Default* |', '\n'],
  horizRulerMarkup: ['', '---', '\n'],
  autoHideToolbar: false,
  autoMaxExpand:false,
  minHeight:0,
  maxHeight:0,
  autoResize:false,
  resizable:false,
  engine: 'raw',
  showToolbar: true
};

/***************************************************************************
 * definitions for editor engines
 */
$.NatEditor.engines = {

/* 
  "engine id": {
    ...
  }
*/

};

/*****************************************************************************
 * register to jquery 
 */
$.fn.natedit = function(opts) {
  //$.log("NATEDIT: called natedit()");

  // build main options before element iteration
  var thisOpts = $.extend({}, $.NatEditor.defaults, opts);

  // DEPRECATED tinymce integration
  if (this.is(".foswikiWysiwygEdit") && typeof(tinyMCE) !== 'undefined') {
    thisOpts.showToolbar = false;
  }

  return this.each(function() {
    if (!$.data(this, "natedit")) {
      $.data(this, "natedit", new $.NatEditor(this, thisOpts));
    }
  });
};

/*****************************************************************************
 * initializer called on dom ready
 */
$(function() {

  $.NatEditor.defaults.web = foswiki.getPreference("WEB");
  $.NatEditor.defaults.topic = foswiki.getPreference("TOPIC");
  $.NatEditor.defaults.systemWeb = foswiki.getPreference("SYSTEMWEB");
  $.NatEditor.defaults.scriptUrl = foswiki.getPreference("SCRIPTURL");
  $.NatEditor.defaults.pubUrl = foswiki.getPreference("PUBURL");
  $.NatEditor.defaults.signatureMarkup = ['-- ', '[['+foswiki.getPreference("WIKIUSERNAME")+']]', ' - '+foswiki.getPreference("SERVERTIME")];
  $.NatEditor.defaults.engine = foswiki.getPreference("NatEditPlugin").Engine;

  // listen for natedit
  $(".natedit").livequery(function() {
    $(this).natedit();
  });

});

})(jQuery);
