/**
 * Two languages, one screen.
 *
 * The English text *is* the key: every string in the app is written normally in
 * English, and `t('Open')` looks it up here. A missing entry simply stays
 * English, so the site can never show a blank label or a raw key.
 *
 * Placeholders use {braces}: t('{done} of {total} done', { done, total }).
 */

export type Lang = 'en' | 'hi'

export const LANGS: { value: Lang; label: string; short: string }[] = [
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'hi', label: 'हिंदी', short: 'हिं' },
]

const hi: Record<string, string> = {
  // ---- header ---------------------------------------------------------
  'MP Police': 'एमपी पुलिस',
  'PYQ Library': 'पेपर लाइब्रेरी',
  'Search papers, shifts, years, solutions…': 'पेपर, शिफ्ट, साल खोजें…',
  'Search papers': 'पेपर खोजें',
  'Admin': 'एडमिन',
  'Language': 'भाषा',
  'Switch to light mode': 'लाइट मोड चालू करें',
  'Switch to dark mode': 'डार्क मोड चालू करें',
  'Switch to Hindi': 'हिंदी में देखें',
  'Switch to English': 'अंग्रेज़ी में देखें',
  'Sign in': 'साइन इन',
  'Sign out': 'साइन आउट',
  'No username yet': 'नाम सेट नहीं है',
  'Library administrator': 'लाइब्रेरी एडमिन',
  'Student account': 'स्टूडेंट अकाउंट',
  'Edit profile': 'प्रोफ़ाइल बदलें',
  'Problem reports': 'शिकायतें',
  'Bulk edit': 'एक साथ बदलें',
  'Library check': 'लाइब्रेरी जाँच',
  'Link check': 'लिंक जाँच',

  // ---- hero -----------------------------------------------------------
  'MP ESB · Constable': 'एमपी ESB · कांस्टेबल',
  'MP Police Constable Previous Papers': 'एमपी पुलिस कांस्टेबल के पिछले पेपर',
  'PDFs': 'PDF',
  'Updated {date}': 'अपडेट {date}',
  'Your progress': 'आपकी प्रगति',
  '{done} of {total} done': '{total} में से {done} पूरे',
  'Practice times a paper with your score, and Notes keeps a private note and an easy / medium / hard rating on each one.':
    'Practice में समय लगाकर पेपर हल करें और स्कोर सेव करें; Notes में हर पेपर पर अपना नोट और आसान / मध्यम / कठिन रेटिंग रखें।',
  'Practice': 'अभ्यास',
  'Notes': 'नोट्स',

  // ---- filters --------------------------------------------------------
  All: 'सभी',
  'Not done': 'बाकी',
  Done: 'पूरे',
  'Filter papers by progress': 'प्रगति के हिसाब से पेपर छाँटें',
  Year: 'साल',
  Shift: 'शिफ्ट',
  Any: 'कोई भी',
  'All years': 'सभी साल',
  'Every shift': 'हर शिफ्ट',
  'Only {year} papers': 'सिर्फ़ {year} के पेपर',
  'Only shift {shift} papers': 'सिर्फ़ शिफ्ट {shift} के पेपर',

  // ---- recent shelf / empty state -------------------------------------
  'Recently added': 'नए जोड़े गए',
  '{count} new': '{count} नए',
  'Added {date}': '{date} को जोड़ा',
  'Recently added papers': 'नए जोड़े गए पेपर',
  'No papers match that': 'ऐसा कोई पेपर नहीं मिला',
  'The library is empty': 'लाइब्रेरी खाली है',
  'Try a different year, shift number or clear the search to see every paper.':
    'कोई दूसरा साल या शिफ्ट चुनें, या खोज हटाकर सारे पेपर देखें।',
  'Paste your Google Drive links to publish the first papers. Students can open them straight away.':
    'पहले पेपर जोड़ने के लिए अपने Google Drive लिंक पेस्ट करें। स्टूडेंट उन्हें तुरंत खोल सकेंगे।',
  'Papers will appear here as soon as the administrator adds them.':
    'एडमिन पेपर जोड़ते ही वे यहाँ दिखने लगेंगे।',
  'Clear search': 'खोज हटाएँ',
  'Add PDFs': 'PDF जोड़ें',

  // ---- card -----------------------------------------------------------
  'Answer key': 'उत्तर कुंजी',
  'Question paper': 'प्रश्नपत्र',
  Easy: 'आसान',
  Medium: 'मध्यम',
  Hard: 'कठिन',
  'Timer running': 'टाइमर चल रहा है',
  Best: 'सर्वश्रेष्ठ',
  'Official ESB page': 'आधिकारिक ESB पेज',
  'Own work': 'स्वयं तैयार',
  Reported: 'बताया गया',
  'Report a problem': 'समस्या बताएँ',
  Open: 'खोलें',
  Download: 'डाउनलोड',
  Mark: 'पूरा करें',
  New: 'नया',
  'Open {title} in Google Drive': 'Google Drive में {title} खोलें',
  'Share {title}': '{title} शेयर करें',
  'Mark {title} as done': '{title} को पूरा चिह्नित करें',
  'Mark {title} as not done': '{title} को अपूर्ण चिह्नित करें',
  'Answer key: {title}': 'उत्तर कुंजी: {title}',
  'Question paper: {title}': 'प्रश्नपत्र: {title}',
  'Your difficulty rating': 'आपकी कठिनाई रेटिंग',
  'Practise this paper against the clock': 'समय लगाकर इस पेपर का अभ्यास करें',
  'Your private note and difficulty rating': 'आपका निजी नोट और कठिनाई रेटिंग',
  'Tell the admin something is wrong with this paper': 'इस पेपर में कोई गड़बड़ी हो तो एडमिन को बताएँ',
  'Drag {title} up or down to reorder': 'क्रम बदलने के लिए {title} को ऊपर-नीचे खींचें',
  'Move up': 'ऊपर ले जाएँ',
  'Move down': 'नीचे ले जाएँ',
  'Move {title} up': '{title} को ऊपर ले जाएँ',
  'Move {title} down': '{title} को नीचे ले जाएँ',
  'Timed attempts': 'समयबद्ध प्रयास',

  // ---- footer ---------------------------------------------------------
  '{count} papers · always free': '{count} पेपर · हमेशा मुफ़्त',
  'Not affiliated with MP ESB. Papers belong to their original publisher. Files stay in Google Drive and open there; this site only stores titles, links, your progress, your private notes and your practice scores.':
    'MP ESB से कोई संबंध नहीं। पेपर उनके मूल प्रकाशक के हैं। फ़ाइलें Google Drive में ही रहती हैं और वहीं खुलती हैं; यह साइट सिर्फ़ शीर्षक, लिंक, आपकी प्रगति, आपके नोट्स और अभ्यास स्कोर रखती है।',

  // ---- install / offline ----------------------------------------------
  'Keep the papers on your home screen': 'पेपर फ़ोन की होम स्क्रीन पर रखें',
  'Install the library — it opens without the browser bars and keeps the last list of papers readable when your network drops.':
    'लाइब्रेरी इंस्टॉल करें — यह ब्राउज़र बार के बिना खुलती है और नेटवर्क जाने पर भी पेपर की आखिरी सूची दिखाती है।',
  'On iPhone or iPad: tap the Share button, then Add to Home Screen. It opens like an app and keeps the last list of papers readable without a network.':
    'iPhone या iPad पर: Share बटन दबाएँ, फिर “Add to Home Screen” चुनें। यह ऐप की तरह खुलेगा और बिना नेटवर्क भी आखिरी सूची दिखाएगा।',
  'Install app': 'ऐप इंस्टॉल करें',
  'Opening…': 'खुल रहा है…',
  'Not now': 'अभी नहीं',
  'You are offline.': 'आप ऑफ़लाइन हैं।',
  'This is the list saved on your device. Papers open from Google Drive, so you will need a connection to read one.':
    'यह आपके फ़ोन में सेव सूची है। पेपर Google Drive से खुलते हैं, इसलिए पढ़ने के लिए इंटरनेट चाहिए।',
  'A new version is ready.': 'नया वर्ज़न तैयार है।',
  Refresh: 'रिफ़्रेश',
  Dismiss: 'हटाएँ',

  // ---- notes ----------------------------------------------------------
  'Your notes': 'आपके नोट्स',
  'Private to you — a reminder of what to revise, and how hard this paper felt.':
    'सिर्फ़ आपके लिए — क्या दोहराना है और पेपर कितना कठिन लगा, इसका रिकॉर्ड।',
  'How did it feel?': 'पेपर कैसा लगा?',
  'Can do it quickly': 'जल्दी हो जाएगा',
  'Needs some thought': 'थोड़ा सोचना पड़ेगा',
  'Revisit this one': 'इसे दोबारा देखें',
  Note: 'नोट',
  'Sectional cut-offs, silly mistakes, topics to revise…':
    'सेक्शन के कट-ऑफ, छोटी गलतियाँ, दोहराने वाले टॉपिक…',
  Clear: 'हटाएँ',
  'Save note': 'नोट सेव करें',
  'Saving…': 'सेव हो रहा है…',
  'Saved — only you can see this.': 'सेव हो गया — यह सिर्फ़ आपको दिखता है।',
  'Note cleared.': 'नोट हटा दिया।',
  'Could not save the note.': 'नोट सेव नहीं हो सका।',
  'Could not clear the note.': 'नोट हटाया नहीं जा सका।',
  'Could not save the note. Check your connection and try again.':
    'नोट सेव नहीं हो सका। कनेक्शन जाँचकर दोबारा कोशिश करें।',

  // ---- practice -------------------------------------------------------
  'Timed practice': 'समयबद्ध अभ्यास',
  'Practice running': 'अभ्यास चल रहा है',
  'Enter the marks you scored once you have checked your answers.':
    'जवाब जाँचने के बाद अपने अंक डालें।',
  'The timer runs while you solve the paper in Google Drive. Stop it when you finish and note your score — it is saved for you.':
    'Google Drive में पेपर हल करते समय टाइमर चलता रहता है। खत्म होने पर रोकें और अपना स्कोर डालें — वह आपके लिए सेव रहेगा।',
  Running: 'चल रहा है',
  'Open paper': 'पेपर खोलें',
  'Finish & enter score': 'खत्म करें और अंक डालें',
  'Cancel this practice': 'यह अभ्यास रद्द करें',
  'Marks scored': 'मिले अंक',
  'Out of': 'कुल अंक',
  'Time taken:': 'लगा समय:',
  Back: 'वापस',
  'Save attempt': 'प्रयास सेव करें',
  'Previous attempts': 'पिछले प्रयास',
  'Remove this attempt': 'यह प्रयास हटाएँ',
  'Start & open paper': 'शुरू करें और पेपर खोलें',
  'Open only': 'सिर्फ़ खोलें',
  'A timer is already running on “{title}”. Finish or cancel that one first.':
    '“{title}” पर टाइमर पहले से चल रहा है। पहले उसे खत्म या रद्द करें।',
  'Stop that timer': 'वह टाइमर रोकें',
  'Start the clock, open the paper in Drive, solve it, then come back here and enter your score. The timer keeps running while you are away.':
    'टाइमर शुरू करें, Drive में पेपर खोलें, हल करें, फिर यहाँ आकर अंक डालें। आपके जाने पर भी टाइमर चलता रहता है।',
  'Timer stopped — nothing was saved.': 'टाइमर रोक दिया — कुछ सेव नहीं हुआ।',
  'Enter the marks you scored.': 'अपने अंक डालें।',
  'Enter the total marks.': 'कुल अंक डालें।',
  'The score cannot be more than the total.': 'अंक कुल अंक से ज़्यादा नहीं हो सकते।',
  'Could not save that attempt.': 'यह प्रयास सेव नहीं हो सका।',
  'Could not save that attempt. Check your connection.': 'यह प्रयास सेव नहीं हो सका। कनेक्शन जाँचें।',
  'Could not save that attempt. Check your connection and try again.':
    'यह प्रयास सेव नहीं हो सका। कनेक्शन जाँचकर दोबारा कोशिश करें।',
  'Attempt removed.': 'प्रयास हटा दिया।',
  'Could not remove that attempt.': 'प्रयास हटाया नहीं जा सका।',
  'Practice saved — {score}/{total}.': 'अभ्यास सेव हो गया — {score}/{total}।',
  'another paper': 'कोई और पेपर',
  'Close': 'बंद करें',

  // ---- profile ---------------------------------------------------------
  'Please choose a picture (JPG, PNG or WebP).': 'कृपया कोई तस्वीर चुनें (JPG, PNG या WebP)।',
  'Use 3–24 letters, numbers, dots or underscores — no spaces.':
    '3–24 अक्षर, अंक, डॉट या अंडरस्कोर इस्तेमाल करें — बीच में स्पेस नहीं।',
  'Please add a profile picture.': 'कृपया प्रोफ़ाइल तस्वीर जोड़ें।',
  'Profile created — welcome!': 'प्रोफ़ाइल बन गई — स्वागत है!',
  'Profile updated.': 'प्रोफ़ाइल अपडेट हो गई।',
  'Could not save your profile.': 'प्रोफ़ाइल सेव नहीं हो सकी।',
  'Finish your profile': 'अपनी प्रोफ़ाइल पूरी करें',
  'Your profile': 'आपकी प्रोफ़ाइल',
  'Pick a username and a profile picture. You only do this once.':
    'एक यूज़रनेम और प्रोफ़ाइल तस्वीर चुनें। यह सिर्फ़ एक बार करना है।',
  'Change the name and picture other people see.': 'वह नाम और तस्वीर बदलें जो दूसरों को दिखती है।',
  'Choose a profile picture': 'प्रोफ़ाइल तस्वीर चुनें',
  Change: 'बदलें',
  'Add photo': 'तस्वीर जोड़ें',
  'Profile picture': 'प्रोफ़ाइल तस्वीर',
  'A square photo works best. It is cropped and shrunk automatically, so a camera photo is fine.':
    'चौकोर तस्वीर सबसे अच्छी लगती है। यह अपने आप क्रॉप और छोटी हो जाती है, इसलिए कैमरे से खींची फोटो भी चलेगी।',
  'Choose another photo': 'दूसरी तस्वीर चुनें',
  'Choose photo': 'तस्वीर चुनें',
  Username: 'यूज़रनेम',
  '3–24 letters, numbers, dots or underscores. This is what classmates see.':
    '3–24 अक्षर, अंक, डॉट या अंडरस्कोर। यही साथी देखते हैं।',
  'Signed in as {email}': '{email} से साइन इन',
  'Create my profile': 'मेरी प्रोफ़ाइल बनाएँ',
  'Save changes': 'बदलाव सेव करें',
  'Sign out instead': 'इसके बजाय साइन आउट करें',

  // ---- problem reports (admin) -----------------------------------------
  Resolved: 'हल हो गया',
  'Reported {date}': '{date} को बताया',
  'Signed-in student': 'साइन इन स्टूडेंट',
  Guest: 'मेहमान',
  'no longer in the library': 'अब लाइब्रेरी में नहीं',
  'Open PDF': 'PDF खोलें',
  'Fix paper': 'पेपर ठीक करें',
  'Mark resolved': 'हल हुआ चिह्नित करें',
  'What students flagged. Fix the paper, then mark it resolved.':
    'स्टूडेंट ने क्या बताया। पेपर ठीक करें, फिर उसे हल हुआ चिह्नित करें।',
  Retry: 'दोबारा कोशिश करें',
  'Loading…': 'लोड हो रहा है…',
  'No reports. Every link students tried so far worked.':
    'कोई शिकायत नहीं। अब तक जो भी लिंक खोला गया, वह चला।',
  'Open · {count}': 'खुली · {count}',
  'Resolved · {count}': 'हल · {count}',
  'Nothing waiting.': 'कुछ बाकी नहीं।',

  // ---- new password ----------------------------------------------------
  'Use at least 6 characters.': 'कम से कम 6 अक्षर इस्तेमाल करें।',
  'The two passwords do not match.': 'दोनों पासवर्ड मेल नहीं खाते।',
  'Password updated — you are signed in.': 'पासवर्ड बदल गया — आप साइन इन हैं।',
  'Could not update the password.': 'पासवर्ड बदला नहीं जा सका।',
  'Choose a new password': 'नया पासवर्ड चुनें',
  'You opened a password reset link. Set a new password for your account.':
    'आपने पासवर्ड रीसेट लिंक खोला है। अपने खाते के लिए नया पासवर्ड सेट करें।',
  'New password': 'नया पासवर्ड',
  'Repeat password': 'पासवर्ड दोहराएँ',
  'Type it again': 'दोबारा लिखें',
  'Save new password': 'नया पासवर्ड सेव करें',

  // ---- confirm / bulk --------------------------------------------------
  Delete: 'हटाएँ',
  Cancel: 'रद्द करें',
  'Deleting…': 'हटाया जा रहा है…',
  'Tap a card to pick it': 'चुनने के लिए किसी कार्ड पर टैप करें',
  '{count} paper selected': '{count} पेपर चुना',
  '{count} papers selected': '{count} पेपर चुने',
  'All {count}': 'सभी {count}',
  'Leave bulk edit': 'एक साथ बदलाव से बाहर निकलें',
  'Edit fields': 'फ़ील्ड बदलें',

  // ---- bulk edit -------------------------------------------------------
  'The exam year should be between 1990 and 2100.': 'परीक्षा साल 1990 से 2100 के बीच होना चाहिए।',
  'Fill in at least one field to change.': 'बदलने के लिए कम से कम एक फ़ील्ड भरें।',
  'A tag cannot be both added and removed.': 'एक टैग को जोड़ा और हटाया दोनों नहीं जा सकता।',
  '{count} paper updated.': '{count} पेपर अपडेट हुआ।',
  '{count} papers updated.': '{count} पेपर अपडेट हुए।',
  'Could not save those changes.': 'वे बदलाव सेव नहीं हो सके।',
  'Edit {count} paper': '{count} पेपर बदलें',
  'Edit {count} papers': '{count} पेपर बदलें',
  'Only the fields you fill in change — everything else on these cards stays as it is.':
    'सिर्फ़ भरी गई फ़ील्ड बदलेंगी — इन कार्डों पर बाकी सब वैसा ही रहेगा।',
  'Move to folder': 'फ़ोल्डर बदलें',
  'Leave blank to keep the current folder': 'मौजूदा फ़ोल्डर रखने के लिए खाली छोड़ें',
  'Add tags': 'टैग जोड़ें',
  'Shift 2, 2025': 'शिफ्ट 2, 2025',
  'Remove tags': 'टैग हटाएँ',
  Solutions: 'हल',
  'One tag': 'एक टैग',
  '{count} tags': '{count} टैग',
  '{tags} added to each card; existing tags are kept, and spelling is tidied as usual.':
    'हर कार्ड में {tags} जुड़ेंगे; पुराने टैग बने रहेंगे और वर्तनी पहले की तरह ठीक कर दी जाएगी।',
  'Exam year': 'परीक्षा साल',
  'Leave blank to keep': 'रखने के लिए खाली छोड़ें',
  'Clear the year on these papers': 'इन पेपरों का साल हटा दें',
  'Keep each shift': 'हर पेपर की शिफ्ट रहने दें',
  'No shift': 'कोई शिफ्ट नहीं',
  'Shift 1': 'शिफ्ट 1',
  'Shift 2': 'शिफ्ट 2',
  'Shift 3': 'शिफ्ट 3',
  'Shift 4': 'शिफ्ट 4',
  'Apply to {count}': '{count} पर लागू करें',

  // ---- page shell / toasts ---------------------------------------------
  'Could not load the library: {error}': 'लाइब्रेरी लोड नहीं हो सकी: {error}',
  'Copy a link that opens this exact list': 'इसी सूची को खोलने वाला लिंक कॉपी करें',
  'Copy a link to this filtered list': 'इस छँटी सूची का लिंक कॉपी करें',
  'Copy link': 'लिंक कॉपी करें',
  'Progress is saved in this browser only': 'प्रगति सिर्फ़ इसी ब्राउज़र में सेव होती है',
  'This device': 'यह डिवाइस',
  'Reorder: hold the ⠿ grip and drag a card, or tap ↑ ↓ on it. The order you set is what every student sees.':
    'क्रम बदलें: ⠿ ग्रिप पकड़कर कार्ड खींचें, या उस पर ↑ ↓ दबाएँ। जो क्रम आप तय करेंगे वही हर स्टूडेंट को दिखेगा।',
  'Progress saved on this device — tap to sync with an account.':
    'प्रगति इसी डिवाइस में सेव है — खाते से सिंक करने के लिए टैप करें।',
  '{papers} in {folders} · {done} done by you': '{folders} में {papers} · आपने {done} पूरे किए',
  'one paper': 'एक पेपर',
  '{count} papers': '{count} पेपर',
  'one folder': 'एक फ़ोल्डर',
  '{count} folders': '{count} फ़ोल्डर',
  'Delete {count} paper?': '{count} पेपर हटाएँ?',
  'Delete {count} papers?': '{count} पेपर हटाएँ?',
  'They will be removed from the library for everyone. Your Drive files are not touched.':
    'ये सबके लिए लाइब्रेरी से हट जाएँगे। आपकी Drive फ़ाइलों को कुछ नहीं होगा।',
  'Delete this paper?': 'यह पेपर हटाएँ?',
  '“{title}” will be removed from the library for everyone. Your Drive file is not touched.':
    '“{title}” सबके लिए लाइब्रेरी से हट जाएगा। आपकी Drive फ़ाइल को कुछ नहीं होगा।',
  Finish: 'खत्म करें',
  '{count} paper removed from the library.': '{count} पेपर लाइब्रेरी से हटाया गया।',
  '{count} papers removed from the library.': '{count} पेपर लाइब्रेरी से हटाए गए।',

  // ---- add / edit PDFs (admin) -----------------------------------------
  'Fix the links marked in red first.': 'पहले लाल रंग में दिखे लिंक ठीक करें।',
  'Every paper needs a title.': 'हर पेपर का शीर्षक ज़रूरी है।',
  'The same Drive file appears twice.': 'एक ही Drive फ़ाइल दो बार लगी है।',
  'The answer key link for “{title}” is not a Google Drive file link.':
    '“{title}” का उत्तर कुंजी लिंक Google Drive फ़ाइल लिंक नहीं है।',
  'this paper': 'यह पेपर',
  'This link': 'यह लिंक',
  'An answer key is the same file as a question paper. Attach a different PDF.':
    'उत्तर कुंजी वही फ़ाइल है जो प्रश्नपत्र है। कोई दूसरी PDF जोड़ें।',
  'Some titles match a paper already in the library. Tick “add anyway” below, or change the titles.':
    'कुछ शीर्षक लाइब्रेरी के पेपर से मेल खाते हैं। नीचे “फिर भी जोड़ें” पर टिक करें, या शीर्षक बदलें।',
  'Pick a folder name.': 'फ़ोल्डर का नाम चुनें।',
  'Official sources need an https:// link.': 'आधिकारिक स्रोत के लिए https:// लिंक चाहिए।',
  'Paste at least one Google Drive link.': 'कम से कम एक Google Drive लिंक पेस्ट करें।',
  'an answer key': 'एक उत्तर कुंजी',
  '{count} answer keys': '{count} उत्तर कुंजियाँ',
  '{pieces} added to the library.': '{pieces} लाइब्रेरी में जोड़े गए।',
  with: 'के साथ',
  '{count} links were skipped — {title}: {message}':
    '{count} लिंक छोड़े गए — {title}: {message}',
  'Could not save those papers.': 'वे पेपर सेव नहीं हो सके।',
  'The title cannot be empty.': 'शीर्षक खाली नहीं हो सकता।',
  'That answer key link is not a Google Drive file link.':
    'वह उत्तर कुंजी लिंक Google Drive फ़ाइल लिंक नहीं है।',
  'Paper updated.': 'पेपर अपडेट हो गया।',
  'Could not update this paper.': 'यह पेपर अपडेट नहीं हो सका।',
  'Edit paper': 'पेपर बदलें',
  'Change the title, folder, tags or source for this paper.':
    'इस पेपर का शीर्षक, फ़ोल्डर, टैग या स्रोत बदलें।',
  'Paste Google Drive links — one per line. Add a title before a pipe: Title | link.':
    'Google Drive लिंक पेस्ट करें — एक लाइन पर एक। पाइप से पहले शीर्षक लिखें: शीर्षक | लिंक।',
  Title: 'शीर्षक',
  Folder: 'फ़ोल्डर',
  'Tags (comma separated)': 'टैग (कॉमा से अलग करें)',
  'Shift 1, 2023, Solutions': 'शिफ्ट 1, 2023, हल',
  'Answer key link (optional)': 'उत्तर कुंजी लिंक (वैकल्पिक)',
  "Paste the answer key PDF's Drive link. It needs no folder, title or tags — the paper's green “Answer key” button opens it.":
    'उत्तर कुंजी PDF का Drive लिंक पेस्ट करें। इसे कोई फ़ोल्डर, शीर्षक या टैग नहीं चाहिए — पेपर का हरा “उत्तर कुंजी” बटन उसे खोलता है।',
  'Drive file id:': 'Drive फ़ाइल id:',
  'Drive links': 'Drive लिंक',
  'In Google Drive: right-click the PDF → Share → “Anyone with the link” → Copy link. Folder links will not work.':
    'Google Drive में: PDF पर राइट-क्लिक करें → Share → “Anyone with the link” → Copy link। फ़ोल्डर के लिंक काम नहीं करेंगे।',
  'Got the answer key too? Paste it in the': 'उत्तर कुंजी भी है? उसे',
  'field under each row below, or put it on the same line as a third part:':
    'फ़ील्ड में नीचे हर पंक्ति के सामने पेस्ट करें, या उसी लाइन पर तीसरे हिस्से के रूप में लगाएँ:',
  'Paper title (required)': 'पेपर का शीर्षक (ज़रूरी)',
  'Paper title': 'पेपर का शीर्षक',
  'Remove link': 'लिंक हटाएँ',
  'Duplicate file in this batch': 'इस बैच में यही फ़ाइल दो बार है',
  'Answer key Drive link (optional)': 'उत्तर कुंजी Drive लिंक (वैकल्पिक)',
  'Answer key Drive link': 'उत्तर कुंजी Drive लिंक',
  'Remove answer key': 'उत्तर कुंजी हटाएँ',
  "✓ Answer key attached — students open it from this paper's green “Answer key” button. No extra card, folder, title or tags.":
    '✓ उत्तर कुंजी जुड़ गई — स्टूडेंट इसे इस पेपर के हरे “उत्तर कुंजी” बटन से खोलेंगे। कोई अलग कार्ड, फ़ोल्डर, शीर्षक या टैग नहीं।',
  Tags: 'टैग',
  'Shift 1, 2023': 'शिफ्ट 1, 2023',
  'One title matches a paper already in the library.':
    'एक शीर्षक लाइब्रेरी के किसी पेपर से मेल खाता है।',
  '{count} titles match papers already in the library.':
    '{count} शीर्षक लाइब्रेरी के पेपरों से मेल खाते हैं।',
  'Add them anyway.': 'फिर भी जोड़ें।',
  'Add to library': 'लाइब्रेरी में जोड़ें',
  '(optional)': '(वैकल्पिक)',
  'Read from the title': 'शीर्षक से पढ़ें',
  'Not set': 'सेट नहीं',
  'Leave both blank and the year and shift are picked out of titles like “07 Nov 2025 Shift 2”. Fill them in only when the title does not say.':
    'दोनों खाली छोड़ें तो साल और शिफ्ट “07 Nov 2025 Shift 2” जैसे शीर्षकों से निकाल लिए जाएँगे। सिर्फ़ तब भरें जब शीर्षक में न लिखा हो।',
  Source: 'स्रोत',
  'Official source link': 'आधिकारिक स्रोत लिंक',
  'That is a folder link. Open the PDF in Drive, then copy its file link.':
    'यह फ़ोल्डर का लिंक है। Drive में PDF खोलकर उसका फ़ाइल लिंक कॉपी करें।',
  'Google Docs links do not work in the Drive PDF viewer. Upload the PDF to Drive instead.':
    'Google Docs लिंक Drive PDF व्यूअर में काम नहीं करते। PDF को Drive में अपलोड करें।',
  'Could not find a file id in this link.': 'इस लिंक में फ़ाइल id नहीं मिली।',
  'Already in the library as “{title}”.': '“{title}” के रूप में लाइब्रेरी में पहले से है।',
  'That file is already the answer key of “{title}”.':
    'वह फ़ाइल पहले से “{title}” की उत्तर कुंजी है।',
  'That answer key is already attached to “{title}”.':
    'वह उत्तर कुंजी पहले से “{title}” से जुड़ी है।',
  'That file is already a paper: “{title}”.': 'वह फ़ाइल पहले से पेपर है: “{title}”।',
  'A paper called “{title}” is already in the library.':
    '“{title}” नाम का पेपर पहले से लाइब्रेरी में है।',

  // ---- library check ---------------------------------------------------
  'Are the Drive links still working, and has anything slipped in twice?':
    'क्या Drive लिंक अब भी चल रहे हैं, और कहीं कोई पेपर दो बार तो नहीं आ गया?',
  Papers: 'पेपर',
  Folders: 'फ़ोल्डर',
  'With answer key': 'उत्तर कुंजी के साथ',
  'No exam year': 'साल नहीं',
  'Link health': 'लिंक की स्थिति',
  'Last checked {date}.': 'आखिरी जाँच {date}।',
  'Checks every paper and answer key the way a student opening it would.':
    'हर पेपर और उत्तर कुंजी को वैसे जाँचता है जैसे कोई स्टूडेंट खोलता है।',
  'Checking…': 'जाँच हो रही है…',
  Recheck: 'दोबारा जाँचें',
  'Check all links': 'सभी लिंक जाँचें',
  '{done} of {total} links checked…': '{total} में से {done} लिंक जाँचे गए…',
  Works: 'चलता है',
  'Not public': 'सार्वजनिक नहीं',
  Missing: 'गायब',
  Unclear: 'साफ़ नहीं',
  'the file is gone or the link is wrong': 'फ़ाइल गायब है या लिंक गलत है',
  'share it as “Anyone with the link”': 'इसे “लिंक वाले कोई भी” के रूप में शेयर करें',
  'Drive did not answer — try again': 'Drive ने जवाब नहीं दिया — दोबारा कोशिश करें',
  Edit: 'बदलें',
  'Delete {title}': '{title} हटाएँ',
  'Every checked link opens for a student.': 'जाँचा गया हर लिंक स्टूडेंट के लिए खुलता है।',
  Duplicates: 'दोहराव',
  'Nothing twice: every Drive file appears once, no two titles match, and no exam slot is claimed by two cards.':
    'कुछ भी दो बार नहीं: हर Drive फ़ाइल एक बार है, किसी दो शीर्षक एक जैसे नहीं, और कोई परीक्षा स्लॉट दो कार्डों का नहीं।',
  '{folder} · added {date}': '{folder} · {date} को जोड़ा',
  'The same Drive file is used by more than one card.': 'एक ही Drive फ़ाइल एक से ज़्यादा कार्ड में लगी है।',
  'These cards have the same title.': 'इन कार्डों का शीर्षक एक जैसा है।',
  'Two cards claim the same exam date and shift in the same folder — probably the same paper uploaded twice.':
    'एक ही फ़ोल्डर में दो कार्ड एक ही तारीख़ और शिफ्ट के हैं — शायद एक ही पेपर दो बार अपलोड हुआ है।',
  'The link checker asks Google Drive about each file from our own server, because a browser is not allowed to read Drive directly. It never downloads a file — only the first part of its preview page.':
    'लिंक जाँचने वाला हमारे सर्वर से Google Drive से हर फ़ाइल के बारे में पूछता है, क्योंकि ब्राउज़र सीधे Drive नहीं पढ़ सकता। यह कोई फ़ाइल डाउनलोड नहीं करता — सिर्फ़ उसके प्रीव्यू पेज का शुरुआती हिस्सा देखता है।',
  'Best {score} of {time} practised.': 'सर्वश्रेष्ठ {score} · कुल {time} अभ्यास।',

  // ---- sign in / report -----------------------------------------------
  'Create an account': 'नया खाता बनाएँ',
  'Students can track progress without an account. Sign in to keep your Done marks on every device — or as the library admin, to add and delete papers.':
    'बिना खाता बनाए भी प्रगति दर्ज होती है। हर डिवाइस पर अपने पूरे किए पेपर रखने के लिए साइन इन करें — या लाइब्रेरी एडमिन के रूप में, पेपर जोड़ने और हटाने के लिए।',
  'New account': 'नया खाता',
  Email: 'ईमेल',
  Password: 'पासवर्ड',
  'you@example.com': 'aap@example.com',
  'At least 6 characters': 'कम से कम 6 अक्षर',
  'Create account': 'खाता बनाएँ',
  'Enter your email address.': 'अपना ईमेल पता डालें।',
  'Enter your email address first.': 'पहले अपना ईमेल पता डालें।',
  'Password must be at least 6 characters.': 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
  'Something went wrong. Try again.': 'कुछ गड़बड़ हो गई। दोबारा कोशिश करें।',
  'Signed in — welcome back.': 'साइन इन हो गया — स्वागत है।',
  'Account created — you are signed in.': 'खाता बन गया — आप साइन इन हैं।',
  'Account created. Check your inbox to confirm your email, then sign in.':
    'खाता बन गया। अपना ईमेल पक्का करने के लिए इनबॉक्स देखें, फिर साइन इन करें।',
  'Could not send the reset link.': 'रीसेट लिंक नहीं भेजा जा सका।',
  'If {email} has an account, a reset link is on its way. Open it on this device to choose a new password.':
    'अगर {email} का खाता है, तो रीसेट लिंक भेज दिया गया है। नया पासवर्ड चुनने के लिए उसे इसी डिवाइस पर खोलें।',
  'Could not send the link.': 'लिंक नहीं भेजा जा सका।',
  'Sign-in link sent to {email}. Open it on this device to finish signing in.':
    '{email} पर साइन-इन लिंक भेज दिया गया। साइन इन पूरा करने के लिए उसे इसी डिवाइस पर खोलें।',
  'Sending reset link…': 'रीसेट लिंक भेजा जा रहा है…',
  'Forgot your password?': 'पासवर्ड भूल गए?',
  or: 'या',
  'Email me a sign-in link': 'ईमेल पर साइन-इन लिंक भेजें',
  'Only the library administrator’s email can add or delete papers. Progress marks are private to each account.':
    'सिर्फ़ लाइब्रेरी एडमिन का ईमेल पेपर जोड़ या हटा सकता है। प्रगति हर खाते के लिए निजी रहती है।',

  // ---- report a problem ------------------------------------------------
  'Report sent': 'शिकायत भेज दी गई',
  'Nothing to sign in for. Tell me what is wrong with this PDF and it will be fixed.':
    'साइन इन करने की ज़रूरत नहीं। इस PDF में क्या गड़बड़ है बताएँ, उसे ठीक कर दिया जाएगा।',
  'Report sent — thank you. It will be checked soon.':
    'शिकायत भेज दी गई — धन्यवाद। जल्द ही इसे देखा जाएगा।',
  'Could not send the report. Try again.': 'शिकायत नहीं भेजी जा सकी। दोबारा कोशिश करें।',
  'Your report for': 'आपकी शिकायत',
  'has been saved. If the link is broken it will be replaced with a working one.':
    'सेव हो गई है। लिंक टूटा होगा तो उसे नए काम करने वाले लिंक से बदल दिया जाएगा।',
  'The PDF does not open': 'PDF नहीं खुलता',
  'Drive says "file not found", or the page stays blank.':
    'Drive कहता है “फ़ाइल नहीं मिली”, या पेज खाली रहता है।',
  'It is a different paper': 'यह कोई और पेपर है',
  'The PDF inside does not match the title.': 'अंदर की PDF शीर्षक से मेल नहीं खाती।',
  'The answer key is missing': 'उत्तर कुंजी नहीं है',
  'There is no answer key for this paper.': 'इस पेपर की कोई उत्तर कुंजी नहीं है।',
  'The answer key is wrong': 'उत्तर कुंजी गलत है',
  'It belongs to another shift, or the answers are wrong.':
    'यह किसी और शिफ्ट की है, या उत्तर गलत हैं।',
  'Something else': 'कुछ और',
  'Tell me below.': 'नीचे बताएँ।',
  'Anything else? (optional)': 'और कुछ? (वैकल्पिक)',
  'For example: the PDF opens but pages 4–7 are missing.':
    'जैसे: PDF खुलती है पर पेज 4–7 गायब हैं।',
  'Send report': 'शिकायत भेजें',
}

export const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, hi }

/** Fills {placeholders}. Missing values are left as they are. */
const fill = (template: string, vars?: Record<string, string | number>) => {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  )
}

export const translate = (
  lang: Lang,
  text: string,
  vars?: Record<string, string | number>,
) => fill(DICTIONARIES[lang]?.[text] ?? text, vars)

/** Picks the starting language: a saved choice wins, else the phone's language. */
export const preferredLang = (): Lang => {
  try {
    const stored = localStorage.getItem('pyq:lang:v1')
    if (stored === 'hi' || stored === 'en') return stored
  } catch {
    /* private mode */
  }
  const locale =
    typeof navigator !== 'undefined' ? navigator.language || navigator.languages?.[0] : ''
  return locale && locale.toLowerCase().startsWith('hi') ? 'hi' : 'en'
}
