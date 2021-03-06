// Implement UI language switching
// Based on sample application at https://developer.mozilla.org/En/How_to_enable_locale_switching_in_a_XULRunner_application

Zotero.LANGUAGE_NAMES = {
	"af-ZA": "Afrikaans",
	"ar": "Arabic",
	"bg-BG": "Bulgarian",
	"ca-AD": "Catalan",
	"cs-CZ": "Czech",
	"da-DK": "Danish",
	"de-AT": "Austrian",
	"de-CH": "Swiss German",
	"de": "German",
	"el-GR": "Greek",
	"en-US": "English (US)",
	"es-ES": "Spanish",
	"et-EE": "Estonian",
	"eu-ES": "Basque",
	"fa": "Farsi",
	"fi-FI": "Finnish",
	"fr-FR": "French",
	"gl-ES": "Galician",
	"he-IL": "Hebrew",
	"hu-HU": "Magyar",
	"hr-HR": "Croatian",
	"id-ID": "Indonesian",
	"is-IS": "Icelandic",
	"it-IT": "Italian",
	"ja-JP": "Japanese",
	"km": "Khmer",
	"ko-KR": "Korean",
	"lt-LT": "Lithuanian",
	"lv": "Latvian",
	"mn-MN": "Mongolian",
	"nb-NO": "Norwegian Bokmål",
	"nl-NL": "Dutch",
	"nn-NO": "Norwegian Nynorsk",
	"pl-PL": "Polish",
	"pt-BR": "Brazilian Portuguese",
	"pt-PT": "Portuguese",
	"ro-RO": "Romanian",
	"ru-RU": "Russian",
	"sk-SK": "Slovak",
	"sl-SI": "Slovene",
	"sr-RS": "Serbian",
	"sv-SE": "Swedish",
	"th-TH": "Thai",
	"tr-TR": "Turkish",
	"uk-UA": "Ukranian",
	"vi-VN": "Vietnamese",
	"zh-CN": "Chinese (Mainland)",
	"zh-TW": "Chinese (Taiwan)"
}

Zotero.DOCUMENT_MULTI_PREFERENCES = [
	"citationTranslation",
	"citationTransliteration",
	"citationSort",
	"citationLangPrefsPersons",
	"citationLangPrefsInstitutions",
	"citationLangPrefsTitles",
	"citationLangPrefsJournals",
	"citationLangPrefsPublishers",
	"citationLangPrefsPlaces"
];

Zotero.LANGUAGE_INDEX = {}

Zotero.setupLocale = function(document) {

	try {
		// Query available and selected locales
	
		var chromeRegService = Components.classes["@mozilla.org/chrome/chrome-registry;1"].getService();
		var xulChromeReg = chromeRegService.QueryInterface(Components.interfaces.nsIXULChromeRegistry);
		var toolkitChromeReg = chromeRegService.QueryInterface(Components.interfaces.nsIToolkitChromeRegistry);
		
		var selectedLocale = xulChromeReg.getSelectedLocale("zotero");

		var availableLocales = toolkitChromeReg.getLocalesForPackage("zotero");
		
		// Render locale menulist
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";


		/*
		 * UI selection
		 */
		
		var localeMenulist = document.getElementById("ui-menulist");
		// Flag at init, to avoid immediate select warning
		localeMenulist.disableSelect = true;
		// Wipe out any existing menupopup
		if (localeMenulist.firstChild) {
			localeMenulist.removeChild(firstChild);
		}
		// Set empty popup
		var menupopup = document.createElement('menupopup');
		localeMenulist.appendChild(menupopup);
		
		var selectedItem = null;

		// Get the list of locales and assign names to each item
		var locales = [];
		var locale;
 		while(availableLocales.hasMore()) {
			locale = availableLocales.getNext();
			locales.push({value: locale, label: Zotero.LANGUAGE_NAMES[locale]});
		}
		// Sort the list by name
		locales.sort( function(a,b){return a.label.localeCompare(b.label)});
		for (var i = 0, ilen = locales.length; i < ilen; i += 1) {
			Zotero.LANGUAGE_INDEX[locales[i].value] = i;
		}
		// Render the list
		for (var i = 0, ilen = locales.length; i < ilen; i += 1) {
			var locale = locales[i];
			var menuitem = document.createElement("menuitem");
			menuitem.setAttribute("value", locale.value);
			menuitem.setAttribute("label", locale.label);
			menupopup.appendChild(menuitem);
			if (locale.value === selectedLocale) {
				selectedItem =  menuitem;
			}
		}
		localeMenulist.selectedItem = selectedItem;
		localeMenulist.disableSelect = false;
		localeMenulist.oldIdx = localeMenulist.selectedIndex;

	} catch (err) {
		Zotero.debug ("PPP Failed to render locale menulist: " + err);	
	}	
}


Zotero.setCitationLanguages = function (obj, citeproc) {
	var segments = ['Persons', 'Institutions', 'Titles', 'Journals', 'Publishers', 'Places'];
	for (var i = 0, ilen = segments.length; i < ilen; i += 1) {
		var settings = Zotero.Prefs.get("csl.citation" + segments[i]);
		if (settings) {
			settings = settings.split(",");
		} else {
			settings = ['orig']
		}
		obj['citationLangPrefs'+segments[i]] = settings;
	}
	obj.citationAffixes = null;
	var affixes = Zotero.Prefs.get("csl.citationAffixes");
	if (affixes) {
		affixes = affixes.split("|");
		if (affixes.length === 48) {
			obj.citationAffixes = affixes;
		}
	}
	if (!obj.citationAffixes) {
		obj.citationAffixes = [,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,];
	}
	// true is for asArray
	var langPrefs = Zotero.CachedLanguages.getAllLangPrefs(true);
	for (var pref in langPrefs) {
		obj[pref] = langPrefs[pref];
	}
	if (citeproc) {
		citeproc.setLangPrefsForCites(obj, function(key){return 'citationLangPrefs'+key});
		
		citeproc.setLangTagsForCslTransliteration(obj.citationTransliteration);
		citeproc.setLangTagsForCslTranslation(obj.citationTranslation);
		citeproc.setLangTagsForCslSort(obj.citationSort);

		citeproc.setLangPrefsForCiteAffixes(obj.citationAffixes);

		citeproc.setAutoVietnameseNamesOption(Zotero.Prefs.get('csl.autoVietnameseNames'));
	}
}

Zotero.isRTL = function(langs) {
	rtl = false;
	for (var i = langs.length - 1; i > -1; i += -1) {
		var langTag = langs[i];
		if (langTag && "string" === typeof langTag) {
			langTag = langTag.replace(/^([-a-zA-Z0-9]+).*/,"$1");
		}
		if (langTag && "string" === typeof langTag) {
			var taglst = langTag.split("-");
			if (["ar", "he", "fa", "ur", "yi", "ps", "syr"].indexOf(taglst[0]) > -1) {
				rtl = true;
				for (var i = 1, ilen = taglst.length; i < ilen; i += 1) {
					if (taglst[i].length > 3) {
						rtl = false;
					}
				}
			}
			// If there is something that looks like a language tag
			// set on the field, it had better be valid. Should always
			// be so, since string input is not allowed.
			break;
		}
	}
	return rtl;
}

Zotero.setRTL = function(node, langs) {
	if (Zotero.isRTL(langs)) {
		node.setAttribute("style", "direction:rtl !important;");
	} else {
		node.setAttribute("style", "direction:ltr !important;");
	}
};
