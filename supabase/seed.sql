-- Leen Coffee — seed data.
--
-- The roasteries, beans and copy here are the ones from the customer-app design
-- so a fresh `supabase db reset` renders exactly the screens that were signed
-- off. `owner_id` is left null: merchant accounts are created through sign-up,
-- and an admin attaches them afterwards.
--
-- Money is in halalas. Prices match the design: 78 / 64 / 56 / 112 SAR.

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

insert into public.categories (slug, name_en, name_ar, sort_order) values
  ('all',           'All',          'الكل',          0),
  ('beans',         'Beans',        'حبوب',          1),
  ('espresso',      'Espresso',     'إسبريسو',       2),
  ('filter',        'Filter',       'تقطير',         3),
  ('saudi-coffee',  'Saudi coffee', 'قهوة سعودية',   4),
  ('gear',          'Brew gear',    'أدوات',         5)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- roasteries
-- ---------------------------------------------------------------------------

insert into public.merchants (
  name_en, name_ar, tagline_en, tagline_ar, city_en, city_ar,
  district_en, district_ar, rating, rating_count,
  eta_min_minutes, eta_max_minutes, established_year,
  lat, lng, is_active, is_open, commission_rate
) values
  (
    'Kaifa Roasters', 'محمصة كيفا',
    'Specialty roastery since 2016', 'محمصة مختصة منذ ٢٠١٦',
    'Riyadh', 'الرياض', 'Al Olaya', 'العليا',
    4.9, 412, 35, 50, 2016,
    24.6942, 46.6853, true, true, 12.00
  ),
  (
    'Nakhla Coffee', 'قهوة نخلة',
    'Small-batch, Red Sea roasted', 'دفعات صغيرة من ساحل البحر الأحمر',
    'Jeddah', 'جدة', 'Al Andalus', 'الأندلس',
    4.7, 268, 45, 60, 2019,
    21.5810, 39.1653, true, true, 12.00
  ),
  (
    'Bayt Sabaa', 'بيت سبأ',
    'Yemeni heritage lots', 'أصول يمنية مختارة',
    'Khobar', 'الخبر', 'Corniche', 'الكورنيش',
    4.8, 154, 40, 55, 2021,
    26.2794, 50.2083, true, true, 12.00
  );

-- ---------------------------------------------------------------------------
-- coffees
-- ---------------------------------------------------------------------------

insert into public.products (
  merchant_id, category_id,
  name_en, name_ar, notes_en, notes_ar, about_en, about_ar,
  roast_level, process, origin_en, origin_ar,
  altitude_en, altitude_ar, variety_en, variety_ar,
  base_price_minor, roasted_on, stock_qty, is_active, is_featured
) values
  (
    (select id from public.merchants where name_en = 'Kaifa Roasters'),
    (select id from public.categories where slug = 'saudi-coffee'),
    'Jazan Khawlani Natural', 'خولاني جازان طبيعي',
    'Date · cocoa · dried fig', 'تمر · كاكاو · تين مجفف',
    'Grown on terraced farms in the Faifa mountains and dried on raised beds for eighteen days. Syrupy body, low acidity, and a long finish of dried fruit — the clearest expression of Saudi coffee we carry.',
    'يُزرع على مصاطب جبال فيفاء ويُجفف على أسرّة مرتفعة لمدة ثمانية عشر يوماً. قوام كثيف وحموضة منخفضة ونهاية طويلة من الفواكه المجففة، وهو أصدق تعبير عن القهوة السعودية لدينا.',
    'medium', 'natural', 'Jazan, Saudi Arabia', 'جازان، السعودية',
    '1,400 m', '١٤٠٠ م', 'Khawlani', 'خولاني',
    7800, current_date - 3, 48, true, true
  ),
  (
    (select id from public.merchants where name_en = 'Nakhla Coffee'),
    (select id from public.categories where slug = 'filter'),
    'Ethiopia Guji Washed', 'إثيوبيا جوجي مغسول',
    'Jasmine · peach · bergamot', 'ياسمين · خوخ · برغموت',
    'A floral, tea-like washed lot from smallholders around Hambela. Best as filter; the bergamot lifts as the cup cools.',
    'دفعة مغسولة زهرية شبيهة بالشاي من صغار المزارعين حول همبيلا. الأفضل كقهوة مقطرة، ويظهر البرغموت أكثر مع برودة الفنجان.',
    'light', 'washed', 'Guji, Ethiopia', 'جوجي، إثيوبيا',
    '2,050 m', '٢٠٥٠ م', 'Heirloom', 'هيرلوم',
    6400, current_date - 2, 60, true, true
  ),
  (
    (select id from public.merchants where name_en = 'Kaifa Roasters'),
    (select id from public.categories where slug = 'espresso'),
    'Espresso Blend No. 4', 'خلطة إسبريسو رقم ٤',
    'Dark chocolate · walnut', 'شوكولاتة داكنة · جوز',
    'Built for milk. Heavy and sweet with a cocoa finish that holds up in a 200 ml latte.',
    'مصممة للحليب. ثقيلة وحلوة بنهاية كاكاو تصمد في لاتيه بحجم ٢٠٠ مل.',
    'dark', 'pulped_natural', 'Brazil · Colombia', 'البرازيل · كولومبيا',
    '1,200 m', '١٢٠٠ م', 'Blend', 'خلطة',
    5600, current_date - 5, 120, true, true
  ),
  (
    (select id from public.merchants where name_en = 'Bayt Sabaa'),
    (select id from public.categories where slug = 'beans'),
    'Yemen Haraz Anaerobic', 'يمن حراز لاهوائي',
    'Raisin · cardamom · honey', 'زبيب · هيل · عسل',
    'Seventy-two hours of sealed fermentation before drying. Intense, spiced and unmistakably Yemeni — a small lot, released twice a year.',
    'اثنتان وسبعون ساعة من التخمير المغلق قبل التجفيف. مكثفة ومبهرة ويمنية بلا شك، دفعة صغيرة تُطلق مرتين في السنة.',
    'medium', 'anaerobic', 'Haraz, Yemen', 'حراز، اليمن',
    '2,200 m', '٢٢٠٠ م', 'Udaini', 'عديني',
    11200, current_date - 1, 22, true, true
  );

-- ---------------------------------------------------------------------------
-- subscription plans
-- ---------------------------------------------------------------------------

insert into public.subscription_plans (
  slug, name_en, name_ar, description_en, description_ar,
  price_minor, perks_en, perks_ar, sort_order
) values
  (
    'daily', 'The Daily', 'اليومية',
    'One 500 g bag of a house espresso or filter roast.',
    'كيس ٥٠٠ جم من إسبريسو المنزل أو تحميص التقطير.',
    7900,
    array['Free delivery', 'Skip anytime'],
    array['توصيل مجاني', 'تأجيل متى شئت'],
    0
  ),
  (
    'explorer', 'The Explorer', 'المستكشفة',
    'Two 250 g bags from a different Saudi roaster each cycle.',
    'كيسان ٢٥٠ جم من محمصة سعودية مختلفة كل دورة.',
    12900,
    array['Rotating roasters', 'Tasting card', '2× points'],
    array['محامص متغيرة', 'بطاقة تذوق', 'نقاط مضاعفة'],
    1
  ),
  (
    'majlis', 'The Majlis', 'المجلس',
    'One kilo, ground for Saudi coffee, plus dates from Al-Ahsa.',
    'كيلو مطحون للقهوة السعودية مع تمر من الأحساء.',
    18900,
    array['Cardamom blend', 'Al-Ahsa dates'],
    array['خلطة الهيل', 'تمر الأحساء'],
    2
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- rewards
-- ---------------------------------------------------------------------------

insert into public.rewards (name_en, name_ar, points_cost, kind, sort_order) values
  ('Free delivery, next order', 'توصيل مجاني للطلب القادم', 400,  'free_delivery', 0),
  ('250 g bag, any roaster',    'كيس ٢٥٠ جم من أي محمصة',   1200, 'free_bag',      1),
  ('V60 starter kit',           'طقم في٦٠ للمبتدئين',        2500, 'gear',          2);

-- ---------------------------------------------------------------------------
-- home banner
-- ---------------------------------------------------------------------------

insert into public.banners (
  kicker_en, kicker_ar, title_en, title_ar, subtitle_en, subtitle_ar,
  target_path, sort_order, is_active
) values
  (
    'THIS WEEK', 'هذا الأسبوع',
    'Khawlani harvest, roasted Sunday', 'حصاد الخولاني، محمّص الأحد',
    'Kaifa Roasters · 40 bags released', 'محمصة كيفا · ٤٠ كيساً فقط',
    '/store/1', 0, true
  );

-- ---------------------------------------------------------------------------
-- promo codes
-- ---------------------------------------------------------------------------

-- The code the design's cart screen applies. 12 SAR off a basket of 50+.
insert into public.promo_codes (code, discount_minor, min_order_minor, is_active)
values ('LEEN12', 1200, 5000, true)
on conflict (code) do nothing;

insert into public.promo_codes (code, discount_percent, max_discount_minor, min_order_minor, is_active)
values ('FIRST15', 15.00, 3000, 8000, true)
on conflict (code) do nothing;
