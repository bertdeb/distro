(function(factory,global){var $=global.jQuery;if(typeof exports==="object"){module.exports=$?factory(global,$):function($){return factory(global,$)}}else if(typeof define==="function"&&define.amd){define(["jquery"],function($){return factory(global,$)})}else{factory(global,false)}})(function(global,$){"use strict";var setGlobals=$===false;$=$||global.jQuery;if(!$||!$.fn){throw"JsObservable requires jQuery"}var versionNumber="v0.9.83",$observe,$observable,$views=$.views=$.views||setGlobals&&global.jsrender&&jsrender.views||{jsviews:versionNumber,sub:{settings:{}},settings:{advanced:function(value){$subSettingsAdvanced=$subSettings.advanced=$subSettings.advanced||{_jsv:true};return value?("_jsv"in value&&($subSettingsAdvanced._jsv=value._jsv),$sub.advSet(),$views.settings):$subSettingsAdvanced}}},$sub=$views.sub,$subSettings=$sub.settings,$subSettingsAdvanced=$subSettings.advanced,$isFunction=$.isFunction,$expando=$.expando,$isArray=$.isArray,OBJECT="object";if(!$.observe){var $eventSpecial=$.event.special,slice=[].slice,splice=[].splice,concat=[].concat,PARSEINT=parseInt,rNotWhite=/\S+/g,propertyChangeStr=$sub.propChng=$sub.propChng||"propertyChange",arrayChangeStr=$sub.arrChng=$sub.arrChng||"arrayChange",cbBindingsStore={},observeStr=propertyChangeStr+".observe",observeObjKey=1,observeCbKey=1,observeInnerCbKey=1,$hasData=$.hasData,$data=$.data,remove={},getCbKey=function(cb){return cb._cId=cb._cId||".obs"+observeCbKey++},ObjectObservable=function(ns,data){this._data=data;this._ns=ns;return this},ArrayObservable=function(ns,data){this._data=data;this._ns=ns;return this},wrapArray=function(data){return $isArray(data)?[data]:data},resolvePathObjects=function(paths,root,callback){paths=paths?$isArray(paths)?paths:[paths]:[];var i,path,object=root,nextObj=object,l=paths&&paths.length,out=[];for(i=0;i<l;i++){path=paths[i];if($isFunction(path)){out=out.concat(resolvePathObjects(path.call(root,root,callback),root));continue}else if(""+path!==path){root=nextObj=path;if(nextObj!==object){out.push(object=nextObj)}continue}if(nextObj!==object){out.push(object=nextObj)}out.push(path)}return out},removeCbBindings=function(cbBindings,cbBindingsId){for(var cb in cbBindings){return}delete cbBindingsStore[cbBindingsId]},onObservableChange=function(ev,eventArgs){function isOb(val){return typeof val===OBJECT&&(paths[0]||allowArray&&$isArray(val))}if(!(ev.data&&ev.data.off)){var allPath,filter,parentObs,oldValue=eventArgs.oldValue,value=eventArgs.value,ctx=ev.data,observeAll=ctx.observeAll,cb=ctx.cb,allowArray=!cb.noArray,paths=ctx.paths,ns=ctx.ns;if(ev.type===arrayChangeStr){(cb.array||cb).call(ctx,ev,eventArgs)}else if(ctx.prop===eventArgs.path||ctx.prop==="*"){if(observeAll){allPath=observeAll._path+"."+eventArgs.path;filter=observeAll.filter;parentObs=[ev.target].concat(observeAll.parents());if(isOb(oldValue)){observe_apply(allowArray,ns,[oldValue],paths,cb,true,filter,[parentObs],allPath)}if(isOb(value)){observe_apply(allowArray,ns,[value],paths,cb,undefined,filter,[parentObs],allPath)}}else{if(isOb(oldValue)){observe_apply(allowArray,ns,[oldValue],paths,cb,true)}if(isOb(value)){observe_apply(allowArray,ns,[value],paths,cb)}}ctx.cb(ev,eventArgs)}}},observe_apply=function(){var args=concat.apply([],arguments);return $observe.apply(args.shift(),args)},$observeAll=function(cb,filter,unobserve){observeAll(this._ns,this._data,cb,filter,[],"root",unobserve)},$unobserveAll=function(cb,filter){$observeAll.call(this,cb,filter,true)},observeAll=function(namespace,object,cb,filter,parentObs,allPath,unobserve,objMap){function observeArrayItems(arr,unobs){l=arr.length;newAllPath=allPath+"[]";while(l--){filterAndObserveAll(arr,l,unobs,1)}}function filterAndObserveAll(obj,prop,unobs,nestedArray){var newObject,newParentObs;if(prop!==$expando){if(newObject=$observable._fltr(newAllPath,obj[prop],nextParentObs,filter)){newParentObs=nextParentObs.slice();if(nestedArray&&updatedTgt&&newParentObs[0]!==updatedTgt){newParentObs.unshift(updatedTgt)}observeAll(namespace,newObject,cb,filter||(nestedArray?undefined:0),newParentObs,newAllPath,unobs,objMap)}}}function wrappedCb(ev,eventArgs){allPath=ev.data.observeAll._path;updatedTgt=ev.target;switch(eventArgs.change){case"insert":observeArrayItems(eventArgs.items);break;case"remove":observeArrayItems(eventArgs.items,true);break;case"set":newAllPath=allPath+"."+eventArgs.path;filterAndObserveAll(eventArgs,"oldValue",true);filterAndObserveAll(eventArgs,"value")}updatedTgt=undefined;cb.apply(this,arguments)}var l,isObject,newAllPath,nextParentObs,updatedTgt,obId,notRemoving=!objMap||objMap.un||!unobserve;if(object&&typeof object===OBJECT){nextParentObs=[object].concat(parentObs);isObject=$isArray(object)?"":"*";if(objMap&&notRemoving&&$hasData(object)&&objMap[obId=$data(object).obId]){objMap[obId]++;return}if(!objMap){objMap={un:unobserve}}if(cb){if(isObject||filter!==0){wrappedCb._cId=getCbKey(cb);if(notRemoving){$observe(namespace,object,isObject,wrappedCb,unobserve,filter,nextParentObs,allPath);obId=$data(object).obId;objMap[obId]=(objMap[obId]||0)+1}else{if(--objMap[$data(object).obId]){return}$observe(namespace,object,isObject,wrappedCb,unobserve,filter,nextParentObs,allPath)}}}else{if(objMap){objMap[$data(object).obId]=1}$observe(namespace,object,isObject,undefined,unobserve,filter,nextParentObs,allPath)}if(isObject){for(l in object){newAllPath=allPath+"."+l;filterAndObserveAll(object,l,unobserve)}}else{observeArrayItems(object,unobserve)}}},shallowFilter=function(allPath){return allPath.indexOf(".")<0&&allPath.indexOf("[")<0},$unobserve=function(){[].push.call(arguments,true);return $observe.apply(this,arguments)};$observe=function(){function innerObserve(){function observeOnOff(namespace,pathStr,isArrayBinding,off){var j,evData,obIdExpando=$hasData(object),boundObOrArr=wrapArray(object),prntObs=parentObs,allPth=allPath;namespace=initialNs?namespace+"."+initialNs:namespace;if(!unobserve&&(off||isArrayBinding)){events=obIdExpando&&$._data(object);events=events&&events.events;events=events&&events[isArrayBinding?arrayChangeStr:propertyChangeStr];el=events&&events.length;while(el--){data=events[el]&&events[el].data;if(data&&(off&&data.ns!==initialNs||!off&&data.ns===initialNs&&data.cb&&data.cb._cId===callback._cId)){return}}}if(unobserve||off){$(boundObOrArr).off(namespace,onObservableChange)}else{evData=isArrayBinding?{}:{fullPath:path,paths:pathStr?[pathStr]:[],prop:prop};evData.ns=initialNs;evData.cb=callback;if(allPath){evData.observeAll={_path:allPth,path:function(){j=prntObs.length;return allPth.replace(/[[.]/g,function(all){j--;return all==="["?"["+$.inArray(prntObs[j-1],prntObs[j]):"."})},parents:function(){return prntObs},filter:filter}}$(boundObOrArr).on(namespace,null,evData,onObservableChange);if(cbBindings){cbBindings[$data(object).obId||$data(object,"obId",observeObjKey++)]=object}}}function getInnerCb(exprOb){var origRt=root;exprOb.ob=contextCb(exprOb,origRt);return exprOb.cb=function(ev,eventArgs){var obj=exprOb.ob,sub=exprOb.sb,newObj=contextCb(exprOb,origRt);if(newObj!==obj){if(typeof obj===OBJECT){bindArray(obj,true);if(sub||allowArray&&$isArray(obj)){innerObserve([obj],sub,callback,contextCb,true)}}exprOb.ob=newObj;if(typeof newObj===OBJECT){bindArray(newObj);if(sub||allowArray&&$isArray(newObj)){innerObserve([newObj],sub,callback,contextCb)}}}callback(ev,eventArgs)}}function bindArray(arr,unbind,isArray,relPath){if(allowArray){var prevObj=object,prevAllPath=allPath;object=arr;if(relPath){object=arr[relPath];allPath+="."+relPath}if(filter&&object){object=$observable._fltr(allPath,object,relPath?[arr].concat(parentObs):parentObs,filter)}if(object&&(isArray||$isArray(object))){observeOnOff(arrayChangeStr+".observe"+(callback?getCbKey(callback):""),undefined,true,unbind)}object=prevObj;allPath=prevAllPath}}var i,p,skip,parts,prop,path,dep,unobserve,callback,cbId,inId,el,data,events,contextCb,innerContextCb,items,cbBindings,depth,innerCb,parentObs,allPath,filter,initNsArr,initNsArrLen,ns=observeStr,paths=this!=1?concat.apply([],arguments):slice.call(arguments),lastArg=paths.pop()||false,root=paths.shift(),object=root,l=paths.length;if(lastArg+""===lastArg){allPath=lastArg;parentObs=paths.pop();filter=paths.pop();lastArg=!!paths.pop();l-=3}if(lastArg===!!lastArg){unobserve=lastArg;lastArg=paths[l-1];lastArg=l&&lastArg+""!==lastArg&&(!lastArg||$isFunction(lastArg))?(l--,paths.pop()):undefined;if(unobserve&&!l&&$isFunction(root)){lastArg=root;root=undefined}}callback=lastArg;if(l&&$isFunction(paths[l-1])){innerContextCb=contextCb=callback;callback=paths.pop();l--}if(unobserve&&callback&&!callback._cId){return}ns+=callback?(inId=callback._inId||"",unobserve)?callback._cId+inId:(cbId=getCbKey(callback))+inId:"";if(cbId&&!unobserve){cbBindings=cbBindingsStore[cbId]=cbBindingsStore[cbId]||{}}initNsArr=initialNs&&initialNs.match(rNotWhite)||[""];initNsArrLen=initNsArr.length;while(initNsArrLen--){initialNs=initNsArr[initNsArrLen];if(root&&(path=paths[0],!path||path+""!==path)){if($isArray(root)){bindArray(root,unobserve,true)}else if(unobserve){observeOnOff(ns,"")}}if(unobserve&&!l&&!root){for(p in cbBindingsStore){p=cbBindingsStore[p];for(data in p){object=p[data];if($isArray(object)){bindArray(object,unobserve,unobserve)}else{observeOnOff(ns,"")}}}}depth=0;for(i=0;i<l;i++){path=paths[i];if(path===""){continue}if(path&&path._cp){contextCb=$sub._gccb(path[0]);origRoot=root=path[0].data;path=path[1]}object=root;if(""+path===path){parts=path.split("^");if(parts[1]){depth=parts[0].split(".").length;path=parts.join(".");depth=path.split(".").length-depth}if(contextCb){items=contextCb(path,root,depth);contextCb=innerContextCb}if(items){l+=items.length-1;splice.apply(paths,[i--,1].concat(items));continue}parts=path.split(".")}else{if(!$isFunction(path)){if(path&&path._jsv){innerCb=unobserve?path.cb:getInnerCb(path);innerCb.noArray=!allowArray;innerCb._cId=callback._cId;innerCb._inId=innerCb._inId||".obIn"+observeInnerCbKey++;if(path.bnd||path.prm&&path.prm.length||!path.sb){innerObserve([object],path.path,[origRoot],path.prm,innerCb,contextCb,unobserve)}if(path.sb){innerObserve([path.ob],path.sb,callback,contextCb,unobserve)}path=origRoot;object=undefined}else{object=path}}parts=[root=path]}while(object&&(prop=parts.shift())!==undefined){if(typeof object===OBJECT){if(""+prop===prop){if(prop===""){continue}if(parts.length<depth+1&&!object.nodeType){if(!unobserve&&(events=$hasData(object)&&$._data(object))){events=events.events;events=events&&events[propertyChangeStr];el=events&&events.length;skip=0;while(el--){data=events[el].data;if(data&&data.ns===initialNs&&data.cb._cId===callback._cId&&data.cb._inId===callback._inId&&(data.prop===prop||data.prop==="*"||data.prop==="**")){if(p=parts.join(".")){data.paths.push(p)}skip++}}if(skip){object=object[prop];continue}}if(prop==="*"||prop==="**"){if(!unobserve&&events&&events.length){observeOnOff(ns,"",false,true)}if(prop==="*"){observeOnOff(ns,"");for(p in object){if(p!==$expando){bindArray(object,unobserve,undefined,p)}}}else{$.observable(initialNs,object)[(unobserve?"un":"")+"observeAll"](callback)}break}else if(prop){observeOnOff(ns+".p_"+prop,parts.join("^"))}}if(allPath){allPath+="."+prop}prop=object[prop]}if($isFunction(prop)){if(dep=prop.depends){innerObserve([object],resolvePathObjects(dep,object,callback),callback,contextCb,unobserve)}break}object=prop;if(unobserve&&object===root&&(i>l-2||paths[i+1]+""!==paths[i+1])){observeOnOff(ns,"")}}}bindArray(object,unobserve)}}if(cbId){removeCbBindings(cbBindings,cbId)}return{cbId:cbId,bnd:cbBindings,s:cbBindingsStore}}var initialNs,allowArray=this!=false,paths=slice.call(arguments),origRoot=paths[0];if(origRoot+""===origRoot&&allowArray){initialNs=origRoot;paths.shift();origRoot=paths[0]}return innerObserve.apply(1,paths)};$observable=function(ns,data){if(arguments.length===1){data=ns;ns=""}return $isArray(data)?new ArrayObservable(ns,data):new ObjectObservable(ns,data)};$sub.getDeps=function(){var args=arguments;return function(){var arg,dep,deps=[],l=args.length;while(l--){arg=args[l--];dep=args[l];if(dep){deps=deps.concat($isFunction(dep)?dep(arg,arg):dep)}}return deps}};$.observable=$observable;$observable._fltr=function(allPath,object,parentObs,filter){if(filter&&$isFunction(filter)?filter(allPath,object,parentObs):true){object=$isFunction(object)?object.set&&object.call(parentObs[0]):object;return typeof object===OBJECT&&object}};$observable.Object=ObjectObservable;$observable.Array=ArrayObservable;$.observe=$observable.observe=$observe;$.unobserve=$observable.unobserve=$unobserve;$observable._apply=observe_apply;ObjectObservable.prototype={_data:null,observeAll:$observeAll,unobserveAll:$unobserveAll,data:function(){return this._data},setProperty:function(path,value,nonStrict){path=path||"";var key,pair,parts,multi=path+""!==path,self=this,object=self._data;if(object){if(multi){nonStrict=value;if($isArray(path)){key=path.length;while(key--){pair=path[key];self.setProperty(pair.name,pair.value,nonStrict===undefined||nonStrict)}}else{for(key in path){self.setProperty(key,path[key],nonStrict)}}}else if(path!==$expando){parts=path.split(/[.^]/);while(object&&parts.length>1){object=object[parts.shift()]}if(object){self._setProperty(object,parts[0],value,nonStrict)}}}return self},removeProperty:function(path){this.setProperty(path,remove);return this},_setProperty:function(leaf,path,value,nonStrict){var setter,getter,removeProp,property=path?leaf[path]:leaf;if($isFunction(property)){if(property.set){leaf=leaf._wrp||leaf;getter=property;setter=getter.set===true?getter:getter.set;property=getter.call(leaf)}}if(property!==value||nonStrict&&property!=value){if(!(property instanceof Date)||property>value||property<value){if(setter){setter.call(leaf,value);value=getter.call(leaf)}else if(removeProp=value===remove){if(property!==undefined){delete leaf[path];value=undefined}else{path=undefined}}else if(path){leaf[path]=value}if(path){this._trigger(leaf,{change:"set",path:path,value:value,oldValue:property,remove:removeProp})}}}},_trigger:function(target,eventArgs){$(target).triggerHandler(propertyChangeStr+(this._ns?"."+/^\S+/.exec(this._ns)[0]:""),eventArgs)}};ArrayObservable.prototype={_data:null,observeAll:$observeAll,unobserveAll:$unobserveAll,data:function(){return this._data},insert:function(index,data){var _data=this._data;if(arguments.length===1){data=index;index=_data.length}index=PARSEINT(index);if(index>-1){data=$isArray(data)?data:[data];if(data.length){this._insert(index,data)}}return this},_insert:function(index,data){var _data=this._data,oldLength=_data.length;if(index>oldLength){index=oldLength}splice.apply(_data,[index,0].concat(data));this._trigger({change:"insert",index:index,items:data},oldLength)},remove:function(index,numToRemove){var items,_data=this._data;if(index===undefined){index=_data.length-1}index=PARSEINT(index);numToRemove=numToRemove?PARSEINT(numToRemove):numToRemove===0?0:1;if(numToRemove>0&&index>-1){items=_data.slice(index,index+numToRemove);if(numToRemove=items.length){this._remove(index,numToRemove,items)}}return this},_remove:function(index,numToRemove,items){var _data=this._data,oldLength=_data.length;_data.splice(index,numToRemove);this._trigger({change:"remove",index:index,items:items},oldLength)},move:function(oldIndex,newIndex,numToMove){numToMove=numToMove?PARSEINT(numToMove):numToMove===0?0:1;oldIndex=PARSEINT(oldIndex);newIndex=PARSEINT(newIndex);if(numToMove>0&&oldIndex>-1&&newIndex>-1&&oldIndex!==newIndex){this._move(oldIndex,newIndex,numToMove)}return this},_move:function(oldIndex,newIndex,numToMove){var items,_data=this._data,oldLength=_data.length,excess=oldIndex+numToMove-oldLength;if(excess>0){numToMove-=excess}if(numToMove){items=_data.splice(oldIndex,numToMove);if(newIndex>_data.length){newIndex=_data.length}splice.apply(_data,[newIndex,0].concat(items));this._trigger({change:"move",oldIndex:oldIndex,index:newIndex,items:items},oldLength)}},refresh:function(newItems,sort){function insertAdded(){if(k){self.insert(j-k,addedItems);dataLength+=k;i+=k;k=0;addedItems=[]}}var i,j,k,newItem,num,self=this,addedItems=[],data=self._data,oldItems=data.slice(),oldLength=data.length,dataLength=oldLength,newLength=newItems.length;self._srt=true;for(j=k=0;j<newLength;j++){if((newItem=newItems[j])===data[j-k]){insertAdded()}else{for(i=j-k;i<dataLength;i++){if(newItem===data[i]){break}}if(i<dataLength){insertAdded();num=0;while(num++<newLength-i&&newItems[j+num]===data[i+num]);self.move(i,j,num);j+=num-1}else{k++;addedItems.push(newItem)}}}insertAdded();if(dataLength>j){self.remove(j,dataLength-j)}self._srt=undefined;self._trigger({change:"refresh",oldItems:oldItems},oldLength);return self},_trigger:function(eventArgs,oldLength){var self=this,_data=self._data,length=_data.length,$_data=$([_data]);if(self._srt){eventArgs.refresh=true}else if(length!==oldLength){$_data.triggerHandler(propertyChangeStr,{change:"set",path:"length",value:length,oldValue:oldLength})}$_data.triggerHandler(arrayChangeStr+(self._ns?"."+/^\S+/.exec(self._ns)[0]:""),eventArgs)}};$eventSpecial[propertyChangeStr]=$eventSpecial[arrayChangeStr]={remove:function(handleObj){var cbBindings,found,events,l,data,evData=handleObj.data;if(evData&&(evData.off=true,evData=evData.cb)){if(cbBindings=cbBindingsStore[evData._cId]){events=$._data(this).events[handleObj.type];l=events.length;while(l--&&!found){found=(data=events[l].data)&&data.cb&&data.cb._cId===evData._cId}if(!found){delete cbBindings[$data(this).obId];removeCbBindings(cbBindings,evData._cId)}}}}};$views.map=function(mapDef){function Map(source,options,target,unbound){var changing,map=this;if(this.src){this.unmap()}if(typeof source===OBJECT){map.src=source;map.tgt=target||map.tgt||[];map.options=options||map.options;map.update();if(!unbound){if(mapDef.obsSrc){$observable(map.src).observeAll(map.obs=function(ev,eventArgs){if(!changing){changing=true;mapDef.obsSrc(map,ev,eventArgs);changing=undefined}},map.srcFlt)}if(mapDef.obsTgt){$observable(map.tgt).observeAll(map.obt=function(ev,eventArgs){if(!changing){changing=true;mapDef.obsTgt(map,ev,eventArgs);changing=undefined}},map.tgtFlt)}}}}if($isFunction(mapDef)){mapDef={getTgt:mapDef}}if(mapDef.baseMap){mapDef=$.extend({},mapDef.baseMap,mapDef)}mapDef.map=function(source,options,target,unbound){return new Map(source,options,target,unbound)};(Map.prototype={srcFlt:mapDef.srcFlt||shallowFilter,tgtFlt:mapDef.tgtFlt||shallowFilter,update:function(options){var map=this;$observable(map.tgt).refresh(mapDef.getTgt(map.src,map.options=options||map.options))},unmap:function(){var map=this;if(map.src){if(map.obs){$observable(map.src).unobserveAll(map.obs,map.srcFlt)}if(map.obt){$observable(map.tgt).unobserveAll(map.obt,map.tgtFlt)}map.src=undefined}},map:Map,_def:mapDef}).constructor=Map;return mapDef};$sub.advSet=function(){$sub._gccb=this._gccb;global._jsv=$subSettings.advanced._jsv?{cbBindings:cbBindingsStore}:undefined}}return $},window);