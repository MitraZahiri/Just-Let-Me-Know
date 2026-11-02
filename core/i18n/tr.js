/**
 * Türkçe metinler. Anahtarlar en.js ile birebir aynı olmalı.
 * Ton: sıcak, kısa, suçlamasız.
 */
var JLMK_I18N = typeof JLMK_I18N !== 'undefined' ? JLMK_I18N : {};

JLMK_I18N.tr = {
  meta: { name: 'Türkçe', dir: 'ltr', complete: true },
  months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  dateFormat: '{{day}} {{month}}',

  employer: {
    greeting: 'Merhaba {{name}},',
    greetingNoName: 'Merhaba,',
    signoff: 'Saygılarımızla,',
    privacy: 'Kişisel verileriniz yalnızca işe alım amacıyla en fazla {{retentionMonths}} ay süreyle saklanır (KVKK). Bu e-postayı yanıtlayarak verilerinizin silinmesini istediğiniz zaman talep edebilirsiniz.' +
      '{{#privacyNoticeUrl}} Aydınlatma metni: {{privacyNoticeUrl}}{{/privacyNoticeUrl}}',
    // Bilerek nötr: İK bir durum seçmeden sonuç ima edilmez.
    Received:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz için teşekkür ederiz. Başvurunuzun bize ulaştığını bildirmek isteriz.\n\n' +
      'Değerlendirme süreci devam ediyor; sonucu size bildireceğiz.\n\n' +
      '{{company}} ile ilgilendiğiniz için teşekkür ederiz.',
    InReview:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz için teşekkür ederiz. Başvurunuz şu anda ekibimiz tarafından değerlendirilmektedir. ' +
      'Bir gelişme olduğunda en kısa sürede size dönüş yapacağız; bu süreçte sizi habersiz bırakmak istemedik.',
    Pool:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz için teşekkür ederiz. Şu an için uygun açık pozisyonumuz bulunmuyor; ancak özgeçmişinizi ' +
      'memnuniyetle aday havuzumuza ekledik. Uygun bir pozisyon açıldığında sizinle iletişime geçeceğiz.',
    Rejected:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz ve ayırdığınız zaman için teşekkür ederiz. Yaptığımız değerlendirme sonucunda bu pozisyon için başka adaylarla ilerlemeye karar verdik.\n\n' +
      'Kolay bir karar olmadı; kariyerinizde başarılar diliyoruz.',
    PositionFilled:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz için teşekkür ederiz. Bu pozisyonun dolduğunu bildirmek isteriz.\n\n' +
      '{{company}} ile ilgilendiğiniz için teşekkür ederiz; gelecekteki ilanlarımızda başvurunuzu yeniden görmekten memnuniyet duyarız.',
  },

  candidate: {
    // İsimle hitapta Hanım/Bey seçimi tahmin edilemeyeceği için hep genel selamlama.
    greeting: 'Merhaba,',
    greetingNoName: 'Merhaba,',
    signoff: 'Saygılarımla,',
    followUp1:
      'Umarım iyisinizdir. {{appliedDate}} tarihinde {{#position}}{{position}} pozisyonu için {{/position}}{{#company}}{{company}} şirketine {{/company}}başvuruda bulunmuştum; süreç hakkında kısaca bilgi almak istedim.\n\n' +
      'Pozisyonla hâlâ çok ilgileniyorum. Kısa bir dönüş bile planlama yapmama çok yardımcı olur.\n\n' +
      'Zaman ayırdığınız için teşekkür ederim.',
    followUp2:
      '{{appliedDate}} tarihinde {{#position}}{{position}} pozisyonu için {{/position}}yaptığım başvuruyla ilgili son bir kez yazıyorum.\n\n' +
      'Pozisyon dolduysa ya da başka adaylarla ilerlemeye karar verdiyseniz, tek satırlık bir yanıt bile benim için çok değerli olur. ' +
      'Hâlâ açıksa, ihtiyaç duyacağınız her bilgiyi memnuniyetle paylaşırım.\n\n' +
      'Teşekkür eder, iyi çalışmalar dilerim.',
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = JLMK_I18N.tr;
