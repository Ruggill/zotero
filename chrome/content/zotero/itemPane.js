/*
    ***** BEGIN LICENSE BLOCK *****
    
    Copyright © 2009 Center for History and New Media
                     George Mason University, Fairfax, Virginia, USA
                     http://zotero.org
    
    This file is part of Zotero.
    
    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
    
    ***** END LICENSE BLOCK *****
*/

var ZoteroItemPane = new function() {
	var _lastItem, _itemBox, _notesLabel, _notesButton, _notesList, _tagsBox, _relatedBox;
	var _translationTarget;
	var _noteIDs;
	
	this.onLoad = function () {
		if (!Zotero) {
			return;
		}
		
		// Not in item pane, so skip the introductions
		//
		// DEBUG: remove?
		if (!document.getElementById('zotero-view-tabbox')) {
			return;
		}
		
		_itemBox = document.getElementById('zotero-editpane-item-box');
		_notesLabel = document.getElementById('zotero-editpane-notes-label');
		_notesButton = document.getElementById('zotero-editpane-notes-add');
		_notesList = document.getElementById('zotero-editpane-dynamic-notes');
		_tagsBox = document.getElementById('zotero-editpane-tags');
		_relatedBox = document.getElementById('zotero-editpane-related');
		
		this._unregisterID = Zotero.Notifier.registerObserver(this, ['item'], 'itemPane');
	}
	
	
	this.onUnload = function () {
		Zotero.Notifier.unregisterObserver(this._unregisterID);
	},
	
	
	/*
	 * Load a top-level item
	 */
	this.viewItem = Zotero.Promise.coroutine(function* (item, mode, index) {
		if (!index) {
			index = 0;
		}
		
		Zotero.debug('Viewing item in pane ' + index);
		
		switch (index) {
			case 0:
				var box = _itemBox;
				break;
			
			case 2:
				var box = _tagsBox;
				break;
			
			case 3:
				var box = _relatedBox;
				break;
		}
		
		// Force blur() when clicking off a textbox to another item in middle
		// pane, since for some reason it's not being called automatically
		if (_lastItem && _lastItem != item) {
			switch (index) {
				case 0:
				case 2:
					yield box.blurOpenField();
					// DEBUG: Currently broken
					//box.scrollToTop();
					break;
			}
		}
		
		_lastItem = item;
		
		var viewBox = document.getElementById('zotero-view-item');
		viewBox.classList.remove('no-tabs');
		
		if (index == 0) {
			document.getElementById('zotero-editpane-tabs').setAttribute('hidden', item.isFeedItem);
			
			if (item.isFeedItem) {
				viewBox.classList.add('no-tabs');
				
				let lastTranslationTarget = Zotero.Prefs.get('feeds.lastTranslationTarget');
				if (lastTranslationTarget) {
					let id = parseInt(lastTranslationTarget.substr(1));
					if (lastTranslationTarget[0] == "L") {
						_translationTarget = Zotero.Libraries.get(id);
					}
					else if (lastTranslationTarget[0] == "C") {
						_translationTarget = Zotero.Collections.get(id);
					}
				}
				if (!_translationTarget) {
					_translationTarget = Zotero.Libraries.userLibrary;
				}	
				this.setTranslateButton();
			}
		}
		else if (index == 1) {
			var editable = ZoteroPane_Local.canEdit();
			_notesButton.hidden = !editable;
			
			while(_notesList.hasChildNodes()) {
				_notesList.removeChild(_notesList.firstChild);
			}
			
			_noteIDs = new Set();
			let notes = yield Zotero.Items.getAsync(item.getNotes());
			if (notes.length) {
				for (var i = 0; i < notes.length; i++) {
					let note = notes[i];
					let id = notes[i].id;
					
					var icon = document.createElement('image');
					icon.className = "zotero-box-icon";
					icon.setAttribute('src','chrome://zotero/skin/treeitem-note.png');
					
					var label = document.createElement('label');
					label.className = "zotero-box-label";
					var title = note.getNoteTitle();
					title = title ? title : Zotero.getString('pane.item.notes.untitled');
					label.setAttribute('value', title);
					label.setAttribute('flex','1');	//so that the long names will flex smaller
					label.setAttribute('crop','end');
					
					var box = document.createElement('box');
					box.setAttribute('class','zotero-clicky');
					box.addEventListener('click', function () { ZoteroPane_Local.selectItem(id); });
					box.appendChild(icon);
					box.appendChild(label);
					
					if (editable) {
						var removeButton = document.createElement('label');
						removeButton.setAttribute("value","-");
						removeButton.setAttribute("class","zotero-clicky zotero-clicky-minus");
						removeButton.addEventListener('click', function () { ZoteroItemPane.removeNote(id); });
					}
					
					var row = document.createElement('row');
					row.appendChild(box);
					if (editable) {
						row.appendChild(removeButton);
					}
					
					_notesList.appendChild(row);
					_noteIDs.add(id);
				}
			}
			
			_updateNoteCount();
			return;
		}
		
		if (mode) {
			box.mode = mode;
			
			if (box.mode == 'view') {
				box.hideEmptyFields = true;
			}
		}
		else {
			box.mode = 'edit';
		}
		
		box.item = item;
	});
	
	
	this.notify = Zotero.Promise.coroutine(function* (action, type, ids, extraData) {
		var viewBox = document.getElementById('zotero-view-item');
		// If notes pane is selected, refresh it if any of the notes change or are deleted
		if (viewBox.selectedIndex == 1 && (action == 'modify' || action == 'delete')) {
			let refresh = false;
			if (ids.some(id => _noteIDs.has(id))) {
				refresh = true;
			}
			if (refresh) {
				yield this.viewItem(_lastItem, null, 1);
			}
		}
	});
	
	
	this.blurOpenField = Zotero.Promise.coroutine(function* () {
		var tabBox = document.getElementById('zotero-view-tabbox');
		switch (tabBox.selectedIndex) {
		case 0:
			var box = _itemBox;
			break;
			
		case 2:
			var box = _tagsBox;
			break;
		}
		if (box) {
			yield box.blurOpenField();
		}
	});
	
	
	this.addNote = function (popup) {
		ZoteroPane_Local.newNote(popup, _lastItem.key);
	}
	
	
	this.removeNote = function (id) {
		var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
								.getService(Components.interfaces.nsIPromptService);
		if (ps.confirm(null, '', Zotero.getString('pane.item.notes.delete.confirm'))) {
			Zotero.Items.trashTx(id);
		}
	}
	
	
	this.translateSelectedItems = Zotero.Promise.coroutine(function* () {
		var collectionID = _translationTarget.objectType == 'collection' ? _translationTarget.id : undefined;
		var items = ZoteroPane_Local.itemsView.getSelectedItems();
		for (let item of items) {
			yield item.translate(_translationTarget.libraryID, collectionID);
		}
	});
	
	
	this.buildTranslateSelectContextMenu = function (event) {
		var menu = document.getElementById('zotero-item-addTo-menu');
		// Don't trigger rebuilding on nested popupmenu open/close
		if (event.target != menu) {
			return;
		}
		// Clear previous items
		while (menu.firstChild) {
			menu.removeChild(menu.firstChild);
		}
		
		let target = Zotero.Prefs.get('feeds.lastTranslationTarget');
		if (!target) {
			target = "L" + Zotero.Libraries.userLibraryID;
		}
		
		var libraries = Zotero.Libraries.getAll();
		for (let library of libraries) {
			if (!library.editable || library.libraryType == 'publications') {
				continue;
			}
			Zotero.Utilities.Internal.createMenuForTarget(
				library,
				menu,
				target,
				function(event, libraryOrCollection) {
					if (event.target.tagName == 'menu') {
						Zotero.Promise.coroutine(function* () {
							// Simulate menuitem flash on OS X
							if (Zotero.isMac) {
								event.target.setAttribute('_moz-menuactive', false);
								yield Zotero.Promise.delay(50);
								event.target.setAttribute('_moz-menuactive', true);
								yield Zotero.Promise.delay(50);
								event.target.setAttribute('_moz-menuactive', false);
								yield Zotero.Promise.delay(50);
								event.target.setAttribute('_moz-menuactive', true);
							}
							menu.hidePopup();
							
							ZoteroItemPane.setTranslationTarget(libraryOrCollection);
							event.stopPropagation();
						})();
					}
					else {
						ZoteroItemPane.setTranslationTarget(libraryOrCollection);
						event.stopPropagation();
					}
				}
			);
		}
	};
	
	
	this.setTranslateButton = function() {
		var label = Zotero.getString('pane.item.addTo', _translationTarget.name);
		var elem = document.getElementById('zotero-feed-item-addTo-button');
		elem.setAttribute('label', label);

		var key = Zotero.Keys.getKeyForCommand('saveToZotero');
		
		var tooltip = label 
			+ (Zotero.rtl ? ' \u202B' : ' ') + '(' 
			+ (Zotero.isMac ? '⇧⌘' : Zotero.getString('general.keys.ctrlShift'))
			+ key + ')';
		elem.setAttribute('tooltiptext', tooltip);
		elem.setAttribute('image', _translationTarget.treeViewImage);
	};
	

	this.setTranslationTarget = function(translationTarget) {
		_translationTarget = translationTarget;
		Zotero.Prefs.set('feeds.lastTranslationTarget', translationTarget.treeViewID);
		ZoteroItemPane.setTranslateButton();
	};
	
		
	this.setToggleReadLabel = function() {
		var markRead = false;
		var items = ZoteroPane_Local.itemsView.getSelectedItems();
		for (let item of items) {
			if (!item.isRead) {
				markRead = true;
				break;
			}
		}
		var elem = document.getElementById('zotero-feed-item-toggleRead-button');
		if (markRead) {
			var label = Zotero.getString('pane.item.markAsRead');
		} else {
			label = Zotero.getString('pane.item.markAsUnread');
		}
		elem.setAttribute('label', label);

		var key = Zotero.Keys.getKeyForCommand('toggleRead');
		var tooltip = label + (Zotero.rtl ? ' \u202B' : ' ') + '(' + key + ')'
		elem.setAttribute('tooltiptext', tooltip);
	};


	function _updateNoteCount() {
		var c = _notesList.childNodes.length;
		
		var str = 'pane.item.notes.count.';
		switch (c){
		case 0:
			str += 'zero';
			break;
		case 1:
			str += 'singular';
			break;
		default:
			str += 'plural';
			break;
		}
		
		_notesLabel.value = Zotero.getString(str, [c]);
	}
}   

addEventListener("load", function(e) { ZoteroItemPane.onLoad(e); }, false);
addEventListener("unload", function(e) { ZoteroItemPane.onUnload(e); }, false);
