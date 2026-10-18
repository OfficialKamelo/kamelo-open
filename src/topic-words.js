// Woordenlijsten voor gevoelige onderwerpen (zie topics.js), in 82 talen.
//
// Per taal:
//  - words: veelgebruikte woorden, om de taal van een zin te herkennen. Zo telt "min" (Zweeds: mijn) niet in een
//    Engelse zin over "10 min", en "ma" (Ests: ik) niet in een Italiaanse zin.
//  - self: ik, mijn, wij, ik heb, ik ben, … Geen "me/mij/to me": "Leg me uit wat diabetes is" is een algemene vraag.
//  - HEALTH, MENTAL, SEXUALITY, RELIGION, MONEY, LEGAL: de onderwerpen.
// Notatie: * = het woord mag langer doorlopen (depressi* → depressie, depressief); *pijn = woordeinde (keelpijn,
// buikpijn); _ = spatie in een woordgroep (een woordgroep met apostrof telt ook zonder: can't_pay → cant pay);
// ! vooraan = de woordgroep zegt zelf al dat het over de schrijver gaat, ook zonder ik/mijn (!behind_on_rent).
// NOT: woorden die zeggen dat het niet over de schrijver gaat (huiswerk, roman, personage): dan geen melding.
// ~ in self: telt als ik-woord, behalve in een zin met een ASK-woordgroep. Zo is "mir ist übel" persoonlijk, maar
// "kannst du mir die Symptome von Diabetes nennen" niet.
// Woorden die ook gewoon werkjargon zijn (disabled, technical debt, dependency, diagnostics) staan er bewust niet in.
// Zelfdoding en zelfbeschadiging ook niet: daar hoort geen privacymelding bij.
//
// Niet elke lijst is door een moedertaalspreker nagekeken. Verbeteringen per taal zijn welkom.
(function (root) {
  'use strict';

  // Talen zonder spaties tussen woorden: zoeken zonder woordgrenzen.
  const DENSE = ['zh', 'ja', 'th', 'lo', 'km', 'my'];
  // Talen waar lidwoorden en voorzetsels vast aan het woord zitten (بالسرطان, בבית_חולים): geen woordgrens aan het begin.
  const LOOSE = ['ar', 'he'];

  const LANGS = {
    // ---------- Europa ----------
    en: {
      words: `the a an and is are was to of in on at it that with for from you what how about can have has had this be
        been do dont not so but if just like got get keep since all no up out he she his her they we me your`,
      // dad's, mom's, …: "dad's blood sugar was 14" gaat ook over iemand om de schrijver heen.
      self: `i i'm im i've ive i'd idk my mine myself our ours dad's mom's mum's husband's wife's son's daughter's
        boyfriend's girlfriend's bf's gf's`,
      NOT: `homework essay essays assignment novel novels fiction chapter protagonist villain main_character
        my_character
        characters screenplay in_my_story short_story history_class pain_point pain_points pain_in_the_neck
        pain_in_the_ass pain_in_the_butt dying_of_laughter rash_decision* sore_loser* technical_debt tech_debt
        design_debt the_history_of learn_about learning_about presentation
        cost_of_debt bad_debt debt_financing debt_to_equity debt-to-equity debt_ratio debt_service national_debt
        government_debt public_debt sovereign_debt corporate_debt company's_debt its_debt debt_fund* balance_sheet
        thesis article_about for_my_class for_class for_school school_project school_assignment coursework
        for_my_course my_course lecture_on research_paper term_paper dissertation blog_post case_study my_students
        lesson_plan lesson_on psychology_class psych_class biology_class sociology_class health_class sex_ed
        paper_on paper_about for_my_paper sociology_paper quiz my_patient my_patients a_patient my_client
        my_clients investor* app_for an_app revision a-level* gcse* compare leaflet flyer our_pharmacy our_clinic
        our_practice opening_hours the_board board_meeting shareholder* supplier*`,
      HEALTH: `diagnosed diagnosis cancer tumor tumour chemo chemotherapy radiotherapy diabetes hiv aids std sti
        pregnan*
        miscarriage abortion ivf medication* prescription* hospital hospitals hospitalized hospitalised hospitalization
        hospitalisation surgery chronic epilepsy asthma heart_attack* dementia alzheimer* parkinson* autism autistic
        adhd
        rheumat* disease* illness* symptom* oncolo* cardiolo* neurologist allergic allergy allergies migraine*
        multiple_sclerosis crohn* endometriosis menopause disability sick_leave
        lump_in lump_on lumps breast_lump chest_pain* stomach_pain* back_pain* joint_pain* pain_in pain_when pain_after
        in_pain painkiller* cramps im_bleeding been_bleeding keeps_bleeding bleeding_from heavy_bleeding blood_in_my
        coughing_up_blood coughing coughed a_cough dry_cough bad_cough cough_for cough_that throwing_up threw_up
        keep_vomiting vomit* diarrhea diarrhoea constipat*
        skin_rash rash_on fever headache* nausea nauseous dizzy dizziness fainted infection* swollen swelling biopsy
        mammogram smear_test pap_smear ultrasound mri x-ray blood_test* test_results scan_results my_doctor my_gp
        broke_his_arm broke_her_arm broke_my_arm broke_his_leg broke_her_leg broke_my_leg broke_my_wrist broken_arm
        broken_leg broken_wrist fracture* hip_hurts back_hurts stomach_hurts head_hurts chest_hurts knee_hurts
        tummy_hurts throat_hurts joints_hurt mole_on weird_mole stops_breathing stop_breathing sleep_apnea
        losing_weight_without lost_weight_without weight_loss_without my_period missed_period period_is_late
        period_late sore_throat throat_is_sore white_spots my_throat my_stomach my_tummy my_knee my_ankle my_hip
        my_joints
        my_kidney* my_liver my_lungs my_bladder my_thyroid out_of_breath rash sore ache aches aching achy *ache itchy
        twitch* high_temperature a_temperature stiff_neck nosebleed* ct_scan mri_scan pet_scan for_a_scan bump_on
        bruise* blister* flu the_flu covid covid-19 have_a_cold got_a_cold caught_a_cold sprain* numb numbness tingling
        bloated bloating heartburn reflux insulin dialysis hernia hair_loss hair_falling_out losing_my_hair seizure*
        had_a_stroke blood_pressure cholesterol when_i_pee burns_when birth_control the_pill iud pills my_meds meds
        see_a_doctor the_doctor urgent_care the_er breastfeed* injury injured concussion dentist toothache cramp*
        cramping pressure_in chest_tightness tight_chest uti stitches deep_cut
        swallowing antibiotic* physio* physical_therapy short_of_breath shortness_of_breath tired_all_the_time
        exhausted_all_the_time
        keeps_forgetting_things forgetting_things_lately memory_loss memory_problems losing_her_memory losing_his_memory
        broke_my_toe broke_my_finger broke_my_foot broke_my_nose broke_my_rib* broken_toe broken_finger broken_foot
        broken_nose broken_rib* herpes chlamydia gonorrh* syphilis hpv genital_warts cold_sore* eczema psoriasis
        hemorrhoid* haemorrhoid* palpitation* heart_keeps_skipping heart_skips_beats skipping_beats blood_sugar*
        morning_after_pill morning-after_pill hrt metformin ozempic wegovy levothyroxine statins warfarin
        wets_the_bed wetting_the_bed bedwetting copd emphysema lice head_lice scabies chickenpox
        giving_birth gave_birth after_birth postpartum post-partum c-section !still_bleeding !still_be_bleeding`,
      MENTAL: `depression* depressed depressive anxiety_disorder* panic_attack* burnout* burn-out* burnt_out burned_out
        eating_disorder* eating_problem binge_eating keep_binging anorexia bulimia bipolar* schizophren* psychosis ptsd
        trauma* psychologist* psychiatrist* therapist* therapy antidepressant* addict* rehab ocd alcoholic alcoholism
        drinking_problem been_low feeling_low feel_low feels_low been_down feeling_down feel_down lonely loneliness
        anxious anxiety panicking insomnia can't_sleep cannot_sleep grief grieving can't_stop_crying keep_crying
        cry_myself cried_myself crying_all crying_every so_stressed stressed_out feel_empty feel_so_empty feel_numb
        feel_worthless feeling_worthless feel_hopeless feeling_hopeless feel_like_a_burden feel_like_nobody
        sad_all_the_time always_sad feel_sad feeling_sad been_sad so_sad dark_time dark_place rough_patch overthink*
        always_on_edge constantly_on_edge so_on_edge heart_races racing_thoughts no_motivation lost_motivation
        unmotivated not_coping can't_cope
        struggling_to_cope really_down so_down hate_myself enjoy_anything stressed snapping_at feel_insecure
        so_insecure low_self-esteem low_self_esteem self-esteem crying_a_lot cried_all nightmares flashbacks counselor*
        counsellor* counseling counselling
        paranoid paranoia hallucinat* hearing_voices anger_issues nervous_breakdown mental_breakdown
        mental_health feel_overwhelmed so_overwhelmed i'm_overwhelmed emotionally drinking_too_much drink_too_much
        gambling_problem falling_apart feel_like_a_failure i'm_a_failure struggling_a_lot really_struggling
        struggling_mentally nervous_around_people so_nervous_around cries_every cries_all crying_every
        can't_get_out_of_bed mood_swings isolating seems_withdrawn so_withdrawn won't_talk_to_anyone
        sertraline zoloft prozac fluoxetine citalopram escitalopram lexapro xanax not_good_enough_at_anything
        never_good_enough feel_like_i'm_not_good_enough feel_not_good_enough don't_have_any_friends
        no_one_to_talk_to feel_so_alone feeling_so_alone feel_completely_alone alone_all_the_time stop_drinking_every
        drinking_every_night drink_every_night quit_drinking haven't_left_the_house can't_leave_the_house
        i_can't_function cry_every cry_all_the_time cry_a_lot burning_out dread_going_to_work dread_work dread_waking_up
        had_a_breakdown gambling_addiction point_of_anything point_in_anything no_point_in_anything nothing_matters
        left_her_room left_his_room leave_her_room leave_his_room barely_eats barely_eating stopped_eating
        first_christmas_since first_christmas_without first_birthday_since first_birthday_without
        first_holidays_since first_holidays_without`,
      SEXUALITY: `gay lesbian* bisexual* transgender* non-binary nonbinary non_binary queer sexual_orientation
        coming-out
        coming_out came_out_to come_out_to come_out_at_work sexuality erectile erection*
        libido asexual aromantic pansexual* demisexual* i'm_bi am_bi is_bi he's_bi she's_bi as_trans is_trans i'm_trans
        he's_trans she's_trans trans_kid trans_man trans_woman start_transitioning gender_identity my_gender dysphoria
        my_pronouns wrong_pronouns attracted_to_men attracted_to_women attracted_to_girls attracted_to_guys
        attracted_to_boys
        attracted_to_anyone attracted_to_the_same attracted_to_both i_like_girls i_like_boys i_like_guys into_girls
        into_guys sex_drive
        sex_life had_sex have_sex having_sex sex_with things_in_bed stuff_in_bed kinky trouble_getting_hard
        can't_get_hard premature_ejaculation his_gender her_gender misgender* deadname* puberty_blockers
        wants_to_be_a_girl wants_to_be_a_boy says_he's_a_girl says_she's_a_boy sexually sexual_health painful_sex
        lost_my_virginity same-sex same_sex outed
        !when_we_have_sex !when_we_had_sex !pain_during_sex !hurts_during_sex like_in_bed orgasm* open_relationship
        open_marriage threesome* cheated_on_me cheating_on_me cheated_on_my_wife cheated_on_my_husband cheated_on_my_girlfriend cheated_on_my_boyfriend cheated_on_my_partner cheated_on_my_gf cheated_on_my_bf
        cheating_on_my_wife cheating_on_my_husband cheating_on_my_girlfriend cheating_on_my_boyfriend cheating_on_my_partner cheating_on_my_gf cheating_on_my_bf having_an_affair
        had_an_affair like_both_guys like_both_girls like_both_men like_both_women like_guys_and_girls
        like_boys_and_girls still_a_virgin a_virgin virginity open_our_marriage open_up_our_marriage
        open_our_relationship being_tied_up bdsm kink* feels_like_a_girl feels_like_a_boy`,
      RELIGION: `muslim* islam* christian* catholic* protestant* jewish hindu* buddhist* atheist* religion* religious
        my_faith our_faith ramadan mosque* synagogue* church_service* my_church our_church going_to_church
        go_to_church went_to_church jehovah* judaism mormon* sikh* evangelical* pentecostal* hijab* headscarf niqab
        burka burqa kippah yarmulke joined_a_cult in_a_cult left_a_cult believe_in_god baptized baptised baptism prayer
        prayers praying pray_every pray_daily pray_to_god pray_five_times
        quran koran imam rabbi pastor priest halal kosher sabbath shabbat first_communion sinful a_sin left_the_church
        leave_the_church`,
      MONEY: `in_debt my_debts our_debts indebted debt_collector* bankrupt* bailiff* foreclos* evict* food_bank
        my_debt credit_card_debt gambling_debt* student_debt student_loan* behind_on_my_bills behind_on_bills
        behind_on_rent
        behind_on_my_rent behind_on_payments behind_on_my_payments behind_on_my_mortgage can't_pay cannot_pay
        can't_afford overdrawn overdraft* maxed_out minimum_payment* payday_loan* garnish* repossess* until_payday
        till_payday missed_payments missed_a_payment i'm_broke so_broke flat_broke owe_the_irs owe_the_bank owe_money
        owe_taxes back_taxes owe_my_landlord owe_rent months_rent months_of_rent back_rent in_the_hole
        keep_up_with_payments keep_up_with_my_bills keep_up_with_rent
        lose_our_house lose_my_house lose_the_house losing_our_home losing_my_home we're_broke can't_buy_food
        debt_collectors collectors_calling medical_debt
        debt_relief debt_consolidation drowning_in_debt car_payment* months_behind account_is_negative negative_balance
        lose_our_apartment lose_my_apartment lose_our_home
        sent_to_collections in_collections bad_credit poor_credit credit_score unemployed laid_off lost_my_job
        lost_his_job lost_her_job on_welfare food_stamps unemployment_benefits universal_credit !we_can't_afford
        !we_can't_pay !behind_on_rent !behind_on_bills
        have_debt has_debt had_debt having_debt so_much_debt lot_of_debt lots_of_debt of_debt out_of_debt pay_off_debt
        paying_off_debt debt_free in_so_much_debt ccj ccjs county_court_judgment* !bailiffs_are_coming
        !bailiff_is_coming can't_make_the_payments can't_make_payments can't_make_my_payments can't_make_rent
        can't_make_the_mortgage paycheck_to_paycheck default_on_my_credit defaults_on_my_credit
        borrow_money_for_rent borrow_money_for_food borrow_money_for_groceries
        borrow_money_for_bills gambled_away gambling_away keep_gambling money_gambling lost_my_savings
        lost_all_my_savings lost_our_savings lost_all_our_savings got_fired been_fired was_fired getting_fired
        fired_me was_let_go been_let_go got_let_go lose_my_job losing_my_job contract_isn't_being_renewed
        contract_wasn't_renewed contract_not_renewed child_support scammed scammer* romance_scam fell_for_a_scam
        out_of_money running_out_of_money run_out_of_money paycheck_is_gone money_is_gone i_owe we_owe owe_like
        on_credit_cards on_my_credit_card* pay_the_minimum gambling betting sports_betting online_casino`,
      LEGAL: `criminal_record* convicted arrested my_arrest probation parole prison jail sentenced court_date court_case
        court_hearing in_court to_court sued suing lawsuit* summons dui dwi drunk_driving shoplift* restraining_order*
        pulled_over charged_with criminal_lawyer defense_lawyer warrant_out warrant_for out_on_bail
        on_bail bail_hearing felony felonies misdemeanor* deport* police_questioned police_want police_are_involved
        police_station police_custody got_locked_up caught_driving driving_without_a_license driving_without_a_licence
        caught_with investigated_for being_investigated under_investigation accused_of
        custody possession_of caught_stealing stole_from_work !questioned_me !interview_me !reported_me_to_the_police
        !arrested_me
        getting_divorced get_divorced got_divorced getting_a_divorce wants_a_divorce want_a_divorce filed_for_divorce
        file_for_divorce my_divorce our_divorce divorcing divorce_papers visitation_rights won't_let_me_see_my
        doesn't_let_me_see_my community_service visa_expires visa_expired visa_expiring visa_was_rejected
        visa_was_denied visa_got_rejected overstay* asylum_application* asylum_claim* asylum_seeker* asylum_case
        asylum_interview applied_for_asylum apply_for_asylum refugee_status residence_permit* immigration_status
        immigration_detention i'm_undocumented am_undocumented we're_undocumented parents_are_undocumented
        undocumented_immigrant* here_illegally green_card_interview without_insurance uninsured illegal_that_i
        is_it_illegal_that is_it_illegal_if_i broke_the_law !got_arrested !been_arrested go_to_court
        have_to_go_to_court`,
    },
    nl: {
      words: `de het een en is van dat die niet op te voor met wat hoe je ben heb heeft al er maar om naar zo nog ook
        als
        bij aan heel geen wil moet kan zijn weet over gaat kun kunt kunnen dit deze hebben worden wordt werd ze
        hij zij hun uit door tot dan wel nu toch even niks niets`,
      self: `ik mijn m'n mn k'heb kheb wij we ons onze voel_me voel_mij slik`,
      NOT: `werkstuk* spreekbeurt* huiswerk opstel scriptie* boekverslag roman thriller detective hoofdpersoon
        personage* hoofdstuk in_mijn_boek in_mijn_verhaal pijnpunt* van_het_lachen pijn_geleden technische_schuld
        de_geschiedenis_van
        leren_over presentatie* artikel_over voor_de_krant vak *vak cursus* *cursus les_over lesbrief* lesplan*
        lesstof lesmateriaal voor_school voor_mijn_studie voor_de_opleiding profielwerkstuk* verslag_over essay*
        opdracht_over hoorcollege* werkcollege* staatsschuld* een_les mijn_klas voor_mijn_klas mijn_leerlingen
        sociologieverslag quiz patiënt een_patiënt mijn_patiënt* mijn_cliënt* mijn_klant mijn_klanten
        investeerder* app_voor opdracht mbo hbo vergelijk folder onze_praktijk onze_huisartsenpraktijk
        openingstijden raad_van_bestuur aandeelhouder* leverancier* schulden_van_ons_bedrijf schulden_van_het_bedrijf bedrijfsschuld*`,
      HEALTH: `gediagnosticeerd diagnose kanker borstkanker darmkanker longkanker huidkanker prostaatkanker tumor chemo
        chemotherapie bestraling* diabetes suikerziekte hiv aids soa zwanger* miskraam abortus ivf medicatie medicijn*
        voorgeschreven ziekenhuis* operatie* geopereerd chronisch* epilepsie astma hartaanval* beroerte dementie
        alzheimer* parkinson* autisme autist* adhd reuma* ziekte* symptomen symptoom huisarts* oncolo* cardiolo*
        neuroloog allergie* allergisch migraine* ms-patiënt crohn* endometriose menopauze
        arbeidsongeschikt* ziekmelding* ziektewet ziek_gemeld
        knobbel* bult bulten bultje* pijn pijn_op_de_borst buikpijn* rugpijn* hoofdpijn* krampen bloed_in bloeding*
        bloedverlies koorts misselijk* overgeven duizelig* flauwgevallen ontsteking* infectie* gezwollen zwelling*
        biopt* mammografie* uitstrijkje* mri röntgen* bloedonderzoek* bloedwaarde* uitslag_van_de_dokter
        uitslag_van_het_onderzoek uitslag_van_de_scan mijn_dokter mijn_arts
        diarree verstopt verstopping hoest* hoesten arm_gebroken been_gebroken pols_gebroken gebroken_arm
        gebroken_been botbreuk* uitslag_op vlekjes moedervlek* snurk* stopt_met_ademen ademstilstand* slaapapneu
        val_af_zonder afgevallen_zonder ongesteld* menstruatie* weken_over_tijd dagen_over_tijd ben_over_tijd
        buiten_adem kortademig* benauwd* last_van_mijn_maag last_van_mn_maag maagzweer heeft_suiker suikerpatiënt*
        insuline* *pijn *ontsteking *kanker *allergie
        blaasinfectie* oorinfectie* longinfectie* schimmelinfectie* maagklachten hartklachten rugklachten darmklachten
        haaruitval haar_valt_uit dialyse ontlasting hernia maagzuur verkouden* griep corona heb_verhoging
        hoge_temperatuur
        stijve_nek bloedneus* ct-scan mri-scan voor_een_scan een_echo jeuk* blauwe_plek* blaren verstuikt verzwikt
        tinteling* doof_gevoel
        opgeblazen_gevoel bloeddruk cholesterol epileptische_aanval pillen de_pil anticonceptie tandarts gewond wond
        blessure* hersenschudding rolstoel oververmoeid vermoeid* *pokken mazelen roodvonk krentenbaard
        met_spoed_opgenomen spoedeisende_hulp de_seh darmen antibiotica
        geheugenproblemen geheugenverlies vergeet_steeds_dingen vergeet_de_laatste_tijd
        onderrug last_van_mijn_rug last_van_mn_rug bloeddrukpil* als_ik_plas bij_het_plassen
        chlamydia herpes gonorroe syfilis hpv genitale_wratten koortslip* aambei* eczeem psoriasis hartkloppingen
        hartritme* hart_slaat_over hart_slaat_soms_over bloedsuiker* mijn_suiker mn_suiker suikerwaarde* metformine
        ozempic wegovy morning-afterpil morningafterpil morning_afterpil morning_after_pil nu_bloed_ik ik_bloed
        dikke_enkel dikke_knie dikke_voet enkel_is_dik ziek_thuis bedrijfsarts re-integr* reïntegr* hormoontherapie
        bevalling* bevallen kraamtijd kraambed keizersnede bloed_verlies bloed_verloren z'n_suiker zn_suiker
        zijn_suiker haar_suiker teen_gebroken vinger_gebroken neus_gebroken rib_gebroken voet_gebroken
        gebroken_teen gebroken_vinger gebroken_neus gebroken_rib gebroken_voet copd longemfyseem hartfalen
        bloeduitslag* ijzertekort bloedarmoede ferritine luizen hoofdluis schurft waterpokken bedplassen
        plast_in_bed`,
      MENTAL: `depressi* angststoornis* angstaanval* paniekaanval* burn-out* burnout* overspannen* opgebrand*
        eetstoornis*
        anorexia boulimia bipolair* schizofren* psychose* ptss trauma* psycholoog* psychiater* therapeut* therapie*
        antidepressiva verslaafd* verslaving* gokverslaafd* gokverslaving* drankverslaafd* alcoholist* drankprobleem*
        alcoholprobleem* drinkt_te_veel drinkt_teveel afkicken ocd dwangstoornis*
        somber* neerslachtig* eenzaam* angstig* slapeloos* kan_niet_slapen niet_kan_slapen slaap_slecht
        voel_me_down zit_niet_lekker_in_mijn_vel rouw rouwen rouwproces sinds_hij_overleden sinds_ze_overleden
        sinds_het_overlijden verdriet* angst
        angsten moe_van_alles kan_me_niet_concentreren concentratieproblemen *verslaafd *verslaving gestrest gestresst
        gestressed
        zit_er_doorheen zit_er_echt_doorheen zit_er_helemaal_doorheen zat_er_doorheen stoppen_met_huilen
        moet_steeds_huilen huilbui* bed_niet_uit voel_me_leeg voel_me_zo_leeg voel_me_waardeloos
        voel_me_zo_waardeloos voel_me_niet_goed voel_me_rot voel_me_zo_rot voel_me_slecht voel_me_alleen
        voel_me_zo_alleen voel_me_ellendig nergens_meer_zin nergens_zin_in nergens_meer_energie in_een_dip pieker*
        zo_gespannen altijd_gespannen constant_gespannen tijd_gespannen hart_gaat_tekeer sluit_zich_op praat_met_niemand
        alles_voelt_zwaar trekt_het_niet trek_het_niet
        kan_het_niet_aan stemmingswisseling* stress zo_onzeker onzeker_over_mezelf zelfbeeld
        minderwaardig* zelfvertrouwen geen_energie_meer alleen_maar_slapen slaap_slecht slaap_al huil huilen huilde
        moet_huilen nachtmerrie* herbeleving* prikkelbaar paniek* overprikkeld overweldigd uitgeput emotioneel ggz
        poh-ggz zelfhaat haat_mezelf mentaal mentale_gezondheid niet_meer_zitten rotperiode moeilijke_periode
        zware_periode sertraline citalopram escitalopram fluoxetine paroxetine venlafaxine oxazepam elke_avond_drinken
        drink_elke_avond stoppen_met_drinken stop_met_drinken weken_de_deur_niet_uit maanden_de_deur_niet_uit
        durf_de_deur_niet_uit elke_sociale_situatie in_sociale_situaties sociale_angst voel_ik_niks_meer voel_ik_niets_meer
        voel_niks_meer voel_niets_meer op_tegen_mijn_werk zie_elke_ochtend_op_tegen zie_elke_dag_op_tegen
        eerste_kerst_sinds eerste_kerst_zonder eerste_verjaardag_sinds eerste_verjaardag_zonder zo_leeg leeg_van_binnen leeg_gevoel nut_van_alles nut_niet_meer
        heeft_geen_zin_meer kamer_niet_uit eet_bijna_niks eet_bijna_niets blowen blowt kom_er_niet_vanaf
        kom_er_niet_meer_vanaf zo_alleen niemand_om_mee_te_praten`,
      SEXUALITY: `homo homoseksu* lesbi* biseksu* gay transgender* non-binair* queer seksuele_geaardheid uit_de_kast
        coming-out coming_out seksualiteit erectie* erectieprobl* impotent* aseksu* panseksu* demiseksu* bi_ben
        ben_ik_bi ben_bi hij_bi zij_bi ze_bi als_trans is_trans ben_trans val_op_meisjes val_op_jongens val_op_mannen
        val_op_vrouwen
        op_meisjes_valt op_jongens_valt op_mannen_valt op_vrouwen_valt aangetrokken_tot dingen_in_bed
        hem_niet_omhoog seks seksleven mijn_gender genderidentiteit genderdysforie mijn_transitie
        hormoonbehandeling op_mannen_of_vrouwen op_vrouwen_of_mannen wil_een_jongen_zijn wil_een_meisje_zijn
        pubertijdsremmers maagdelijkheid ontmaagd* seksueel seksuele
        hem_niet_meer_omhoog open_relatie vreemdga* vreemdgegaan vreemd_gegaan vreemd_gaan vrijen vrijt vrijde
        orgasme* klaarkomen trans_is trans_ben ik_trans_ben maagd nog_maagd vastgebonden bdsm kink* fetisj* op_vrouwen
        op_mannen op_meisjes op_jongens doen_het_niet_meer doen_het_bijna_niet doen_het_bijna_nooit
        voelt_zich_een_meisje voelt_zich_een_jongen`,
      RELIGION: `moslim* islam* christen* christelijk* katholiek* protestant* joods jood hindoe* boeddhist* atheïst*
        atheist*
        gelovig* religie* religieus* bekeerd* bekeren* mijn_geloof mn_geloof m'n_geloof ons_geloof hun_geloof
        in_god ramadan moskee* synagoge* kerkdienst* kerk kerken kerkgemeente* kerkelijk* jehova* gereformeerd*
        hervormd* evangelisch* pinkstergemeente* mormoon* gedoopt jodendom hoofddoek* boerka nikab keppel sekte* dopen
        laten_dopen bidden gebed*
        imam dominee pastoor priester rabbijn koran bijbel halal koosjer sabbat communie vormsel
        niet_meer_geloof niet_meer_gelovig uit_het_geloof geloof_verlaten mijn_geloof_kwijt
        bid_ik bid_elke ik_bid_elke ik_bid_voor ik_bid_tot ik_bid_dagelijks`,
      MONEY: `schulden schuldhulp* schuldsanering* schuldeiser* deurwaarder* incassobureau* betalingsachterstand*
        huurachterstand* bewindvoerder* beschermingsbewind wsnp failliet* faillissement* uitzetting* voedselbank
        achter_met_betalen achter_met_de_huur rood_staan sta_rood staat_rood in_het_rood kan_niet_betalen
        rekeningen_niet_betalen niet_betalen niet_meer_betalen niet_terugbetalen maanden_niet_betaald
        niet_betaald_heb aanmaning* gestorneerd storno* aan_de_limiet aan_mijn_limiet creditcardschuld* loonbeslag
        beslaglegging beslag_gelegd eruit_te_zetten uit_huis_gezet studieschuld* tot_mn_salaris tot_mijn_salaris
        gokschuld* belastingschuld* schuld_bij *schulden rekening_geblokkeerd rekening_is_geblokkeerd achterstand_bij
        betalingsregeling* krap_bij_kas rond_te_komen rond_moet_komen rondkomen
        niet_meer_betaald blut platzak geld_lenen geld_geleend bijstand uitkering* werkloos ontslagen baan_kwijt
        huis_kwijt huis_verliezen schuldhulpverlening in_de_min
        dwangbevel* invordering*
        een_schuld_van euro_schuld heb_een_schuld hebt_een_schuld heeft_een_schuld hebben_een_schuld met_een_schuld
        mijn_schuld_af* mn_schuld_af* onze_schuld_af* van_mijn_schuld_af schuld_afbetalen schuld_aflossen
        schuld_af_te_betalen schuld_af_te_lossen schuld_terugbetalen schuld_terug_te_betalen mijn_schuld_wordt
        onze_schuld_wordt schuld_groeit schuld_loopt_op schuld_is_opgelopen openstaande_schuld* flinke_schuld
        hoge_schuld grote_schuld in_de_schuld duoschuld* duo-schuld* huurschuld* zorgschuld* energieschuld*
        bkr-registratie* bkr-notering* bkr-codering* bkr-code* bkr_registratie* bkr_notering* bkr_codering*
        bij_het_bkr bij_bkr negatieve_bkr* a-codering !deurwaarder_komt !deurwaarder_staat !deurwaarder_is_geweest
        creditcard_staat_vol creditcard_zit_vol lening_afgesloten_om vergokt elke_maand_geld_tekort geld_tekort_voor_de_huur geld_tekort_voor_de_boodschappen in_de_ww
        contract_wordt_niet_verlengd contract_niet_verlengd me_ontslaan alimentatie kinderalimentatie opgelicht
        oplichter* oplichting gescamd duizend_schuld schuld_op_mijn_creditcard schuld_op_mn_creditcard geld_is_op
        salaris_is_op is_al_op gokken gokt online_casino casino`,
      LEGAL: `strafblad* veroordeeld* gearresteerd* taakstraf* celstraf* gevangenis* reclassering* enkelband
        ben_opgepakt werd_opgepakt zijn_opgepakt gisteren_opgepakt vannacht_opgepakt opgepakt_door opgepakt_voor
        rechtszaak* rechtbank* rechtszitting* bij_de_rechter voor_de_rechter verhoor* rijden_onder_invloed
        ben_aangehouden werd_aangehouden aangehouden_voor aangehouden_door betrapt_op winkeldiefstal* aangifte_tegen
        dagvaarding* contactverbod* straatverbod* gebiedsverbod* verdacht_van advocaat_nodig strafrechtadvocaat*
        jaar_cel maanden_cel zonder_rijbewijs ingevorderd voorarrest* voorlopige_hechtenis politiecel*
        strafbeschikking* zit_in_de_cel betrapt_met aangifte_gedaan_tegen werkstraf*
        verdachte proces-verbaal voogdij strafzaak* huiszoeking aangeklaagd
        aanklacht* oproep_van_de_politie !me_verhoord !aangifte_tegen_mij !aangifte_tegen_me
        verhoren wil_scheiden gaan_scheiden ga_scheiden willen_scheiden laten_scheiden echtscheiding* vechtscheiding*
        ben_gescheiden aan_het_scheiden scheidingsadvocaat scheidingsconvenant omgangsregeling* ouderlijk_gezag
        kinderen_niet_zien verblijfsvergunning* asielaanvraag* asielzoeker* asielprocedure* asielstatus
        asiel_aangevraagd asiel_aanvragen ongedocumenteerd* geen_papieren vreemdelingendetentie
        vreemdelingenbewaring gezinshereniging de_ind bij_de_ind van_de_ind moet_het_land_uit moeten_het_land_uit
        het_land_uit_gezet uitgezet_naar !me_verhoren strafbaar aanklagen aanklaagt klaagt_me_aan klaagt_mij_aan
        aangehouden met_drank_op onder_invloed blaastest zonder_verzekering`,
    },
    de: {
      words: `der die das und ist nicht ein eine zu mit auf für wie was habe hab bin seit nur noch sind du den dem
        des einen einem einer kann können muss soll wird wurde hat haben auch aber oder wenn dass weil sehr schon
        immer mehr kein keine keinen bei aus von über jetzt heute doch gibt dir dich sich nix nichts ganz echt total`,
      self: `ich mein* unser* wir uns ~mir ~mich bin hab habe glaub fühl fühle nehme`,
      ASK: `kannst_du_mir könntest_du_mir kannst_du_mich kannst_du_uns gib_mir gebe_mir zeig_mir zeige_mir sag_mir
        sage_mir nenn_mir nenne_mir erklär_mir erkläre_mir mir_erklären mir_erklärst erklärst_du_mir schreib_mir
        schreibe_mir fasse_mir hilf_mir_bei hilf_mir_einen hilf_mir_eine empfiehl_mir empfehle_mir mir_empfehlen
        mir_zeigen mir_sagen mir_nennen mir_geben`,
      NOT: `hausaufgabe* hausarbeit* referat* aufsatz aufsätze seminararbeit* bachelorarbeit* masterarbeit*
        abschlussarbeit* facharbeit* doktorarbeit* dissertation seminar *seminar vorlesung* *vorlesung unterricht
        *unterricht schulprojekt* für_die_schule für_die_uni kurs kurses lernkarte* präsentation* vortrag* roman
        romans kurzgeschichte* hauptfigur* protagonist* drehbuch gedicht* figur_in geschichte_über eine_geschichte
        die_geschichte_der die_geschichte_von artikel_über blogartikel* blogbeitrag* whitepaper fallstudie*
        nicht_übel nichts_übel technische_schulden staatsschulden* staatsverschuldung*
        schuldenbremse schuldenquote essay* *hausarbeit unterrichtsstunde* meine_klasse für_meine_klasse
        meine_schüler meinen_schülern quiz ein_patient eine_patientin mein_patient meine_patientin
        meine_patienten mein_kunde meine_kundin meine_kunden investor* investoren app_für klausur* *klausur
        vergleiche meine_figur szene vorstand aufsichtsrat aktionär* lieferant* öffnungszeiten schulden_unserer_firma
        schulden_der_firma schulden_des_unternehmens`,
      HEALTH: `diagnostiziert diagnose diagnosen befund* krebs* *krebs tumor* chemo* chemotherapie* bestrahlung*
        diabetes zuckerkrank* schwanger* fehlgeburt* abtreibung* medikament* tablette* krankenhaus* klinik*
        chronisch* epilepsie asthma herzinfarkt* schlaganfall* demenz* alzheimer* parkinson* autismus autist* adhs
        rheuma* krankheit* erkrank* krank kranke krankenschein arbeitsunfähig* symptom* hausarzt* hausärzt* arzt
        ärztin zum_arzt beim_arzt frauenarzt* frauenärzt* kinderarzt* kinderärzt* zahnarzt* zahnärzt* notaufnahme
        notarzt onkolog* kardiolog* neurolog* allergi* migräne* krankgeschrieben krankschreibung* behinderung*
        behindert* schwerbehindert* pflegegrad* pflegeheim* rollstuhl wechseljahre* *schmerzen *schmerz schmerz*
        schmerzt *entzündung entzündet infektion* infekt fieber fiebrig knoten* knubbel* beule* übelkeit übel
        schwindel* schwindelig schwindlig ohnmächtig* weh kopfweh bauchweh zahnweh halsweh ohrenweh tut_weh tun_weh
        ausschlag* juckreiz juckt pickel* blutung* blute blutet blut_im blut_beim blutzucker* blutdruck* blutwert*
        bluttest* blutbild* cholesterin* schilddrüse* *unterfunktion *überfunktion insulin* metformin ozempic
        l-thyroxin levothyroxin antibiotik* schmerzmittel* schnarch* atemaussetzer* schlafapnoe atemnot kurzatmig*
        husten* hustet erkältet erkältung* grippe corona covid durchfall verstopfung erbrech* mich_übergeben
        übergebe übergeben_muss kreislauf kreislaufprobleme kreislaufkollaps herzrasen herzstolpern herzrhythmus*
        herzprobleme herzschwäche zuckt zucken muttermal* leberfleck* ultraschall mrt ct röntgen* biopsie*
        mammographie abstrich* operiert* operation_am meine_operation einer_operation der_operation nach_der_op
        einer_op der_op meine_periode meine_tage periode_ist_überfällig tage_überfällig regelblutung* menstruation*
        zyklus geburt nach_der_geburt entbindung* kaiserschnitt* wochenbett stillzeit verhütung* pille_danach
        inkontinenz blasenschwäche beim_pinkeln brennt_beim nieren* leber lunge* hörsturz tinnitus verschwommen
        kribbeln kribbelt taubheit* bandscheibe* hexenschuss knochenbruch* armbruch* beinbruch* fraktur* gebrochen
        gebrochenen verstaucht geschwollen* schwellung* verletzt verletzung* gehirnerschütterung wunde genäht ekzem
        neurodermitis schuppenflechte herpes chlamydien tripper syphilis hpv feigwarzen scheidenpilz pilzinfektion
        hämorrhoiden borreliose zeckenbiss sodbrennen reflux gastritis magen reizdarm zöliakie unverträglichkeit*
        intoleranz reha physiotherapie krankengymnastik haarausfall gewicht_verloren abgenommen_ohne immer_müde
        ständig_müde vergesslich gedächtnisprobleme copd lungenemphysem läuse kopfläuse krätze windpocken
        bettnässen nässt_ein`,
      MENTAL: `depression* depressiv* deprimiert* angststörung* panikattack* panik burn-out* burnout* ausgebrannt
        essstörung* magersucht bulimie fressattack* bipolar* schizophren* psychose* ptbs trauma* psycholog*
        psychiater* psychotherapeut* therapeut* therapie* antidepressiv* sertralin citalopram escitalopram fluoxetin
        venlafaxin tavor süchtig* drogensucht* alkoholsucht* spielsucht* kaufsucht* handysucht* pornosucht*
        medikamentensucht* entzug* alkoholiker* zu_viel_trinken trinkt_zu_viel trinke_zu_viel jeden_abend_trinken
        trinke_jeden trinkt_jeden kiffen kifft kiffe zwangsstörung* zwangsgedanken weine* weinen heul*
        niedergeschlagen* traurig* einsam* fühl_mich_allein fühle_mich_allein schlaflos* nicht_schlafen
        kann_nicht_schlafen schlafe_schlecht schlafstörung* albträum* alpträum* angst ängste ängstlich*
        angstzustände* gestresst überfordert* überforderung erschöpft* ausgelaugt fühl_mich_leer fühle_mich_leer
        so_leer innerlich_leer antriebslos* keine_lust_mehr keine_kraft_mehr keine_energie_mehr alles_sinnlos
        einen_sinn_mehr mehr_einen_sinn seh_keinen_sinn sehe_keinen_sinn nicht_mehr_aus_dem_bett nicht_aus_dem_bett
        kaum_aus_dem_bett nicht_aus_ihrem_zimmer nicht_aus_seinem_zimmer zieht_sich_zurück redet_kaum
        redet_nicht_mehr isst_kaum isst_nichts_mehr trauer trauere trauern erste_weihnachten_seit
        erste_weihnachten_ohne ersten_geburtstag_ohne grübel* gedankenkarussell
        nervenzusammenbruch selbstwert* selbstzweifel* minderwertigkeit* fühl_mich_wertlos fühle_mich_wertlos
        versager stimmungsschwankung* reizbar wutausbrüch* psychisch* mental mentale mentaler seelisch* seele
        herz_rast mein_herz_rast krieg_keine_luft bekomme_keine_luft *angst nicht_mehr_vor_die_tür
        kaum_noch_vor_die_tür kaum_vor_die_tür so_allein niemanden_zum_reden`,
      SEXUALITY: `schwul* lesbisch* lesbe bisexuell* bi_bin bin_bi bin_ich_bi ist_bi bin_trans ist_trans trans_ist
        als_trans transgender* transsexuell* geschlechtsangleichung* nicht-binär* nichtbinär* queer asexuell*
        pansexuell* sexuelle_orientierung coming-out coming_out geoutet outen sexualität* sex sexleben sexuell*
        erektion* erektionsstörung* potenzprobleme potenzmittel impotent* libido orgasmus* lust_auf_sex jungfrau
        jungfräulich* entjungfert offene_beziehung offene_ehe betrogen fremdgegangen fremdgehen fremdgeht affäre
        gefesselt_werden fetisch* stehe_auf_männer stehe_auf_frauen stehe_auf_jungs stehe_auf_mädchen hingezogen
        kondom* ungeschützten_verkehr ungeschützter_verkehr ungeschützten_sex mit_ihm_geschlafen mit_ihr_geschlafen
        mit_jemandem_geschlafen fühlt_sich_als_mädchen fühlt_sich_als_junge geschlechtsverkehr geschlechtsidentität meine_pronomen pubertätsblocker dysphorie`,
      RELIGION: `muslim* moslem* islam* christlich* christin christen katholisch* katholik* evangelisch* protestant*
        jüdisch* jude jüdin judentum hindu* buddhist* atheist* gläubig* glaube_an_gott an_gott nicht_mehr_an_gott
        religion* religiös* moschee* synagoge* ramadan kirche* gottesdienst* zur_messe in_die_messe beten bete
        betet gebet* koran bibel imam pfarrer* pastor* priester rabbiner halal koscher kopftuch* zum_islam
        zum_judentum zum_christentum zum_buddhismus konvertiert_zum konvertieren_zum zeugen_jehovas jehova* sekte*
        mormon* freikirche* getauft taufe taufen aus_der_kirche kirchenaustritt konfirmation* kommunion firmung
        sünde*`,
      MONEY: `schulden* schuldner* schuldnerberatung* gerichtsvollzieher* inkasso* privatinsolvenz* insolvenz* pleite
        zwangsräumung* räumungsklage* mietschulden* mietrückstand* im_rückstand mahnung* mahnbescheid* im_minus
        im_dispo dispo konto_überzogen konto_ist_überzogen nicht_zahlen nicht_bezahlen nicht_mehr_bezahlen
        nicht_leisten nicht_mehr_leisten kein_geld geld_reicht_nicht reicht_nicht_mehr pfändung* gepfändet
        kontopfändung* schufa* kredit_abbezahlen kreditkartenschulden* spielschulden* verzockt* verspielt
        erspartes_verloren ersparnisse_verloren alles_verloren abgezockt* abzocke betrüger* betrugsmasche
        reingefallen geld_verloren bürgergeld hartz* arbeitslos* arbeitslosengeld jobcenter mir_gekündigt
        wurde_gekündigt gekündigt_worden fristlose_kündigung kündigung_bekommen entlassen job_verloren
        arbeit_verloren unterhalt unterhaltszahlung* kindesunterhalt sozialhilfe wohngeld miete_nicht
        knapp_bei_kasse !können_die_miete_nicht online_casino online-casino sportwetten`,
      LEGAL: `vorstrafe* vorbestraft* verurteilt* verhaftet* festgenommen* gefängnis* haftstrafe* bewährung* knast
        führungszeugnis* gerichtstermin* gerichtsverfahren* vor_gericht amtsgericht familiengericht* anzeige_gegen
        strafanzeige* anzeige_erstattet mich_angezeigt strafbefehl* strafbar strafe geldstrafe* bußgeld* polizei*
        vorgeladen vorladung* zeuge verhör polizeiverhör vernommen verklagt* verklagen klage eingeklagt anwalt*
        anwältin* strafverteidiger* staatsanwalt* ermittlungsverfahren* ermittelt untersuchungshaft*
        kontrolle_geraten führerschein_weg führerschein_los führerschein_abgeben führerscheinentzug fahrverbot
        führerschein_entzogen betrunken_gefahren alkohol_am_steuer promille ohne_versicherung ohne_führerschein
        schwarzfahren schwarzgefahren ladendiebstahl* diebstahl* scheidung* scheiden geschieden trennungsjahr
        sorgerecht* umgangsrecht* umgangsregelung* kinder_nicht_sehen visum_läuft visum_abgelaufen
        visum_abgelehnt aufenthaltstitel* aufenthaltserlaubnis* aufenthaltsgenehmigung* duldung asyl*
        abschiebung* abgeschoben ausländerbehörde einbürgerung* kontaktverbot* annäherungsverbot*`,
    },
    fr: {
      words: `le la les et est un une des pas pour que qui dans avec ai suis de du au à depuis a son sa ses fait je
        ce cette ces mais où sur par plus très bien tout tous rien comment pourquoi quand quoi c'est ça être avoir
        peux veux dois sais vais était encore toujours déjà aussi chez leur elle elles vous ils ne`,
      // "me" alleen in woordgroepen: los telt het ook in Spaanse zinnen mee ("me ayudas a escribir…").
      self: `je j' j’ jai jsuis jarrête mon ma mes nous notre nos ~moi m'a m'ont ça_me ca_me me_fait me_font`,
      ASK: `donne-moi donne_moi dis-moi dis_moi explique-moi explique_moi montre-moi montre_moi écris-moi écris_moi
        fais-moi fais_moi aide-moi_à aide_moi_à conseille-moi conseille_moi résume-moi résume_moi`,
      NOT: `devoirs devoir_maison dissertation* exposé exposés rédaction mémoire_sur thèse pour_mon_cours
        pour_le_cours pour_un_cours mon_cours_de cours_de_psycho* en_classe pour_la_classe pour_l'école pour_la_fac
        fiche_de_révision roman romans personnage* héros héroïne scénario poème* poésie l'histoire_de l'histoire_du
        une_histoire article_sur article_de_blog billet_de_blog présentation* étude_de_cas livre_blanc newsletter
        m'expliquer dette_publique dette_de_l'état dette_technique dette_souveraine
        un_essai essai_sur une_séance séance_sur ma_classe pour_ma_classe mes_élèves quiz un_patient une_patiente
        mon_patient mes_patients mon_client ma_cliente mes_clients nos_clients investisseur* appli_pour
        application_pour mon_mémoire dm mon_dm compare comparer comparez fournisseur* conseil_d'administration
        actionnaire* horaires_d'ouverture dette_de_notre_entreprise dette_de_l'entreprise dette_de_la_société`,
      HEALTH: `diagnostiqué* diagnostic cancer* tumeur* chimio* radiothérapie diabète diabétique* glycémie insuline
        metformine enceinte grossesse accouchement accouché* après_l'accouchement post-partum césarienne
        fausse_couche avortement ivg pilule* contraception stérilet mes_règles retard_de_règles médicament*
        ordonnance mon_traitement hôpital hopital urgences hospitalisé* opéré opérée me_faire_opérer
        se_faire_opérer faire_opérer chirurgie maladie_chronique douleur_chronique douleurs_chroniques épilepsie
        asthme crise_cardiaque infarctus avc démence alzheimer* parkinson* autisme autiste* tdah maladie* malade
        symptôme* médecin médecin_traitant généraliste gynéco* dermato* cardiolo* oncolo* neurolo* allergi*
        migraine* arrêt_maladie arrêt_de_travail handicap* ménopause grosseur* kyste* nodule* j'ai_mal jai_mal
        fait_mal mal_à_la_tête mal_au_ventre mal_au_dos mal_à_la_gorge mal_aux_dents mal_au_genou douleur*
        douloureu* fièvre nausée* vomi* vertige* étourdi* évanoui* malaise infection* inflammation enflé* gonflement
        saigne saigner saignement* saigné du_sang sang_dans toux tousse* rhume enrhumé* grippe covid angine otite
        bronchite diarrhée constipé* constipation brûlures_d'estomac reflux éruption* démangeaison* ça_gratte
        eczéma psoriasis herpès bouton_de_fièvre chlamydia mycose* ist mst hpv hémorroïdes ronfle* apnée*
        respirer essoufflé* me_suis_cassé s'est_cassé cassé_la cassé_le cassé_l' fracture* entorse foulé* plâtre
        blessé* blessure* commotion brûlure* points_de_suture ma_tension tension_artérielle hypertension cholestérol
        thyroïde hypothyroïdie prise_de_sang bilan_sanguin analyses_de_sang résultats_d'analyse* irm radiographie
        échographie biopsie mammographie frottis dialyse reins rein foie poumon* palpitation* tachycardie arythmie
        toujours_fatigué* perte_de_poids perte_de_mémoire kiné* rééducation fauteuil_roulant antibiotique*
        doliprane paracétamol ibuprofène pipi ça_brûle ça_brule brûle_quand poux lentes gale varicelle
        rougeole bpco pipi_au_lit énurésie !saigner_encore !saigne_encore !saigne_toujours`,
      MENTAL: `dépression* dépressi* déprim* trouble_anxieux anxiété anxieu* angoiss* crise_d'angoisse
        crise_d’angoisse crises_d'angoisse attaque_de_panique paniqu* stress stressé* burn-out burnout épuisement
        épuisé* à_bout bout_du_rouleau trouble_alimentaire troubles_alimentaires anorexi* boulimi* hyperphagie
        bipolaire* schizophrén* psychose* tspt trauma* traumatis* psy mon_psy psychologue* psychiatre*
        psychothérap* thérapeute* thérapie* antidépresseur* anxiolytique* sertraline fluoxétine escitalopram xanax
        lexomil addict* accro alcoolique* alcoolisme boit_trop bois_trop boit_tous_les_soirs bois_tous_les_soirs
        arrêter_de_boire joints cannabis drogue* toc pleure* pleurer pleuré triste* tristesse déprime mal-être
        mal_être me_sens_seul* sens_seul* solitude isolé* me_sens_vide sens_vide me_sens_nul* me_sens_mal
        me_sens_pas_bien pas_le_moral plus_le_moral envie_de_rien plus_envie goût_à_rien intérêt_de_rien
        plus_de_sens dors_plus dors_pas arrive_pas_à_dormir arrive_plus_à_dormir insomnie* cauchemar* deuil chagrin
        premier_noël_depuis premier_noël_sans premier_anniversaire_sans confiance_en_moi estime_de_soi
        me_déteste rumine* ruminer idées_noires santé_mentale crise_de_nerfs sort_plus ne_sort_plus
        mange_presque_rien mange_plus s'isole renferm* coeur_s'emballe cœur_s'emballe boule_au_ventre phobie*
        surmené* surmenage trop_seul* si_seul* tellement_seul* personne_à_qui_parler`,
      SEXUALITY: `homosexuel* homo gay lesbienne* bisexuel* suis_bi est_bi transgenre* suis_trans est_trans
        non-binaire non_binaire queer asexuel* pansexuel* orientation_sexuelle coming-out coming_out sexualité sexe
        sexuel* relations_sexuelles rapport_sexuel rapports_sexuels non_protégé non_protégés sans_préservatif
        sans_capote préservatif* capote coucher_avec couché_avec couche_avec érection* impuissan* libido orgasme*
        suis_vierge encore_vierge toujours_vierge est_vierge virginité couple_libre relation_libre
        relation_ouverte couple_ouvert plan_à_trois libertin* échangisme m'a_trompé* me_trompe trompé_ma
        trompé_mon tromper_ma tromper_mon infidél* adultère être_attaché* bondage fétich* attiré_par attirée_par
        aime_les_filles aime_les_garçons aime_les_hommes aime_les_femmes identité_de_genre dysphorie mes_pronoms
        bloqueurs_de_puberté se_sent_fille se_sent_garçon on_a_plus_de_rapports n'avons_plus_de_rapports
        avons_plus_de_rapports`,
      RELIGION: `musulman* islam* lislam chrétien* catholique* protestant* évangélique* juif juive* judaïsme hindou*
        bouddhiste* athée* croyant* croire_en_dieu crois_en_dieu ne_crois_plus en_dieu perdu_la_foi religion*
        religieu* mosquée* synagogue* église* messe prier je_prie prière* coran bible imam prêtre curé pasteur
        rabbin halal casher kasher porter_le_voile le_voile ramadan carême baptême baptisé* baptiser communion
        témoins_de_jéhovah jéhovah secte sectes me_convertir se_convertir converti_à convertie_à à_l'islam
        au_judaïsme au_christianisme au_catholicisme apostasie apostat un_péché pécheur quitter_l'église`,
      MONEY: `dettes dette endetté* surendett* huissier* recouvrement* faillite* expulsion* expulsé* loyers_impayés
        mes_impayés des_impayés loyer_impayé loyer_en_retard de_loyer_en_retard retard_de_paiement banque_alimentaire restos_du_cœur
        restos_du_coeur à_découvert mon_découvert peux_pas_payer peux_plus_payer pouvons_pas_payer
        !on_peut_pas_payer !on_peut_plus_payer arrive_pas_à_payer arrive_plus_à_payer arrive_plus_à_rembourser
        arrive_pas_à_rembourser crédits_à_la_consommation crédit_conso mes_crédits mon_crédit rachat_de_crédit*
        fiché* fichage banque_de_france finir_le_mois boucler_le_mois fins_de_mois fauché* plus_un_sou
        plus_d'argent arnaqu* escroqu* escroc* perdu_nos_économies perdu_mes_économies au_jeu dettes_de_jeu
        jeux_d'argent paris_sportifs chômage au_chômage licencié* licenciement* viré perdu_mon_travail
        perdu_mon_boulot paie_pas paye_pas paie_plus paye_plus pas_payé_mon_loyer pas_payé_le_loyer casino
        pension_alimentaire saisie_sur_salaire interdit_bancaire commission_de_surendettement`,
      LEGAL: `casier_judiciaire condamné* garde_à_vue interpellé* prison* incarcéré* en_détention
        détention_provisoire sursis bracelet_électronique été_arrêté été_arrêtée fait_arrêter police policiers
        gendarme* commissariat convoqué* convocation_au_commissariat convocation_à_la_gendarmerie
        convocation_au_tribunal tribunal tribunaux procès juge mon_avocat un_avocat_pour besoin_d'un_avocat
        avocat_pénaliste avocate porter_plainte porté_plainte déposé_plainte plainte_contre en_justice
        poursuites_judiciaires me_poursuit amende contravention retrait_de_permis permis_suspendu
        suspension_de_permis perdre_mon_permis alcoolémie état_d'ivresse alcool_au_volant sans_assurance
        sans_permis illégal illégale vol_à_l'étalage divorc* garde_des_enfants garde_alternée garde_exclusive
        droit_de_visite droit_de_garde voir_les_enfants voir_mes_enfants titre_de_séjour carte_de_séjour
        sans_papiers sans-papiers oqtf demande_d'asile demandeur_d'asile asile naturalisation
        ordonnance_de_protection`,
    },
    es: {
      words: `el la los las y es un una que de no por para con qué del al lo le les se su sus muy más pero como
        cuando porque desde hace hasta sin sobre también ya está están puedo puede hay ahora siempre nada todo esto
        esta este eso ser hacer después antes mucho poco bien mal donde dónde cuál`,
      self: `yo mi mis tengo estoy soy nuestro* nuestra* nosotros nosotras ~me conmigo mío mía llevo he hemos tenemos
        estamos somos siento sufro padezco tomo debo noto`,
      ASK: `me_puedes me_podrías me_podrias me_dices me_dirías me_das me_darías me_recomiendas me_recomendarías
        me_ayudas me_ayudarías me_explicas me_explicarías me_haces me_harías me_escribes me_cuentas me_resumes
        me_pasas me_traduces me_enseñas me_muestras me_buscas me_dejas_una me_das_una me_das_un`,
      NOT: `deberes tarea tareas trabajo_sobre trabajo_de_clase un_trabajo_para para_clase para_la_clase clase_de
        mi_clase_de en_clase asignatura* un_ensayo ensayo_sobre redacción monografía tesis tfg tfm
        exposición_sobre presentación* novela* un_relato relato_corto un_cuento cuento_sobre personaje*
        protagonista* guion guión poema* canción_sobre la_historia_de la_historia_del una_historia artículo_sobre
        artículo_de_blog entrada_de_blog estudio_de_caso deuda_pública deuda_publica
        deuda_técnica deuda_soberana deuda_del_estado deuda_externa una_clase_sobre clase_sobre mis_alumnos
        para_mis_alumnos quiz un_paciente una_paciente mi_paciente mis_pacientes mi_cliente mis_clientes
        inversor* inversionista* app_para una_app aplicación_para compara comparar comparación proveedor* la_junta
        junta_directiva accionista* horario_de_apertura trabajo_de_religión trabajo_de_historia
        trabajo_de_filosofía trabajo_de_sociología trabajo_de_biología trabajo_de_psicología deuda_de_nuestra_empresa deuda_de_la_empresa`,
      HEALTH: `diagnosticad* diagnóstico diagnosticaron cáncer cancer tumor* quimio* radioterapia diabetes diabétic*
        azúcar_de_mi el_azúcar glucosa insulina metformina embarazad* embarazo parto posparto postparto cesárea
        aborto* pastilla_del_día_después píldora* anticonceptiv* diu me_baja_la_regla me_vino_la_regla
        retraso_de_la_regla mi_regla menstruación mi_periodo medicación medicament* pastillas hospital urgencias
        hospitalizad* me_operan me_van_a_operar operado operada operaron cirugía crónic* epilepsia asma infarto*
        derrame_cerebral ictus demencia alzheimer* parkinson* autismo autista* tdah enfermedad* enfermo enferma
        síntoma* sintoma* médico medico médica médico_de_cabecera ginecólog* dermatólog* cardiólog* oncólog*
        neurólog* pediatra dentista alergia* alérgic* migraña* baja_médica de_baja discapacidad* silla_de_ruedas
        menopausia bulto* nódulo* quiste* fiebre dolor* duele duelen dolía me_duela sarpullido erupción granos
        ronchas me_pica picazón náusea* nausea* vómit* vomit* mareo* mareado mareada desmay* infección* inflamad*
        inflamación hinchad* hinchó hinchazón sangre sangrando sangrado sangro sangra sangrar tos toso resfriad*
        gripe covid catarro anginas otitis diarrea estreñid* estreñimiento acidez reflujo ronca ronco ronquido*
        apnea dejar_de_respirar deja_de_respirar cuesta_respirar falta_de_aire me_ahogo rompí_el rompí_la me_rompí
        se_rompió_el se_rompió_la fractura* esguince torcí_el escayola herida* herido puntos_de_sutura quemadura*
        conmoción tensión_alta la_tensión hipertensión colesterol tiroides hipotiroidismo análisis_de_sangre
        analítica resonancia tac escáner radiografía ecografía biopsia mamografía citología diálisis riñón riñones
        hígado pulmón pulmones palpitaciones taquicardia arritmia siempre_cansad* pérdida_de_peso perdiendo_peso
        pérdida_de_memoria fisio* rehabilitación antibiótico* ibuprofeno paracetamol hacer_pis al_orinar orinar
        me_arde escuece muela* me_tiembla herpes clamidia gonorrea sífilis vph verrugas hongos candidiasis
        hemorroides eccema psoriasis dermatitis acné !seguir_sangrando !sigo_sangrando epoc piojos liendres sarna varicela se_hace_pis
        moja_la_cama`,
      MENTAL: `depresión depre depresiv* deprimid* ansiedad ansios* angustia* trastorno_de_ansiedad ataque_de_pánico
        ataques_de_pánico ataque_de_ansiedad ataques_de_ansiedad crisis_de_ansiedad pánico estrés estresad* burnout
        agotamiento trastorno_alimentario anorexi* bulimi* atracón* atracones bipolar* esquizofren* psicosis tept
        trauma* traumatizad* psicólog* psiquiatra* psicoterap* terapeuta* terapia* antidepresiv* ansiolític*
        sertralina fluoxetina escitalopram lorazepam diazepam orfidal adicción adict* alcohólic* alcoholismo
        bebe_demasiado bebo_demasiado bebe_todos_los_días bebe_todas_las_noches bebo_todas_las_noches
        dejar_de_beber porros drogas toc llorar lloro llorando lloré lloraba llora triste* tristeza me_siento_sol*
        siento_sol* soledad me_siento_vací* siento_vací* me_siento_mal me_siento_fatal sin_ganas no_tengo_ganas
        ganas_de_nada sentido_a_nada veo_sentido no_puedo_dormir no_duermo insomnio pesadilla* duelo luto
        primera_navidad_desde primera_navidad_sin primer_cumpleaños_sin autoestima inseguridad* me_odio no_valgo_nada
        agobiad* agobio estoy_mal estoy_fatal salud_mental no_sale_de_casa no_sale_de_su sin_salir_de_su
        sin_salir_de_casa casi_no_come se_encierra aislad* aislamiento se_me_acelera nervios nerviosa nervioso
        fobia* ansiedad_social me_siento_agotad* muy_solo muy_sola tan_sola con_quién_hablar con_quien_hablar
        nadie_con_quien_hablar tragaperras !lloro !no_le_veo_sentido !le_veo_sentido`,
      SEXUALITY: `homosexual* gay lesbiana* bisexual* soy_bi es_bi soy_trans es_trans transgénero no_binari* queer
        asexual* pansexual* orientación_sexual salir_del_armario salió_del_armario salí_del_armario sexualidad sexo
        sexual* relaciones_sexuales sin_protección sin_condón condón preservativo* me_acosté_con acostarme_con
        me_acuesto_con erección* impotencia disfunción_eréctil libido orgasmo* soy_virgen siendo_virgen es_virgen
        virginidad relación_abierta pareja_abierta infiel infidelidad me_engaña me_engañó me_ha_engañado cuernos
        bondage fetiche* me_gustan_los_chicos me_gustan_las_chicas me_gustan_los_hombres me_gustan_las_mujeres
        me_atraen atraída_por atraído_por no_tenemos_relaciones tener_relaciones tenemos_relaciones
        se_siente_niña se_siente_niño se_siente_chica se_siente_chico identidad_de_género disforia mis_pronombres`,
      RELIGION: `musulmán musulmana* musulmanes islam* cristian* católic* catolic* protestante* evangélic* judío*
        judía* judaísmo hindú budista* ateo atea agnóstic* creyente* creer_en_dios creo_en_dios en_dios religión
        religios* mezquita* sinagoga* iglesia* misa a_misa rezar rezo reza corán biblia sacerdote rabino halal
        kosher hiyab ramadán cuaresma bautiz* bautismo comunión testigos_de_jehová jehová secta* mormón
        convertirme convertirse_al al_islam al_judaísmo al_cristianismo pecado* apostasía dejar_la_iglesia
        dejé_de_creer dejar_de_creer ya_no_creo`,
      MONEY: `deudas deuda endeudad* desahucio* quiebra bancarrota cobrador* moroso* morosos asnef banco_de_alimentos
        números_rojos no_puedo_pagar no_podemos_pagar no_llego_a_fin_de_mes llegar_a_fin_de_mes a_fin_de_mes
        no_me_queda_nada no_me_alcanza no_nos_alcanza préstamo* prestamo* minicrédito* crédito_rápido
        meses_de_alquiler debo_el_alquiler impago* recibos_devueltos embargo embargar embargad* embargan estafa*
        estafad* timo timad* me_timaron nuestros_ahorros perdí_mis_ahorros se_ha_jugado jugado_nuestros apuestas
        ludopatía ludópata en_el_paro cobrar_el_paro subsidio* ingreso_mínimo_vital me_despidieron
        sin_pagar quitar_el_piso quitar_la_casa perder_la_casa perder_el_piso casa_de_apuestas casino
        me_han_despedido me_acaban_de_despedir despedido perdí_mi_trabajo perdí_el_trabajo sin_trabajo
        pensión_alimenticia`,
      LEGAL: `antecedentes_penales condenad* detenid* arrestad* cárcel prisión libertad_condicional encarcelad*
        !me_arrestaron !me_detuvieron !me_han_detenido me_pararon policía guardia_civil comisaría denuncia*
        denunciado denunciada demandado demandada me_demanda me_ha_demandado demandar juicio juzgado* tribunal*
        juez jueza abogad* multa* sanción me_quitan_el_carnet quitar_el_carnet perder_el_carnet puntos_del_carnet
        conducir_borracho conduciendo_borracho alcoholemia sin_seguro sin_carnet ilegal delito* robé hurto robo
        divorci* custodia régimen_de_visitas ver_a_mis_hijos ver_a_los_niños ver_a_mi_hijo ver_a_mi_hija
        permiso_de_residencia tarjeta_de_residencia sin_papeles arraigo deport* asilo solicitud_de_asilo
        refugiad* orden_de_alejamiento extranjería`,
    },
    it: {
      words: `il lo la gli le e è un una che di non per con ma`,
      self: `io mio mia miei mie ho sono nostro* nostra* noi`,
      HEALTH: `diagnosticat* cancro tumore* chemio* diabete diabetic* incinta gravidanza aborto* farmac* ospedale*
        ricoverat* cronic* epilessia asma infarto* ictus demenza alzheimer* parkinson* autismo autistic* adhd malattia*
        sintom* medico_di_base allergi* emicrania* disabilità menopausa`,
      MENTAL: `depressione depress* ansia attacco_di_panico attacchi_di_panico burnout disturbo_alimentare anoressi*
        bulimi* bipolar* schizofreni* psicosi ptsd trauma* psicolog* psichiatra* psicoterapeut* terapeuta* terapia*
        antidepressiv* tossicodipendent*`,
      SEXUALITY: `omosessual* gay lesbica lesbiche bisessual* transgender non_binari* queer orientamento_sessuale
        coming_out sessualità erezione`,
      RELIGION: `musulman* islam* cristian* cattolic* protestant* ebreo ebrea ebrei indù buddhista* buddista* ateo atea
        credente* religione religios* moschea sinagoga ramadan`,
      MONEY: `debiti indebitat* pignoramento ufficiale_giudiziario recupero_crediti fallimento fallit* sfratto*
        banco_alimentare`,
      LEGAL: `fedina_penale casellario_giudiziale condannat* arrestat* carcere prigione galera libertà_vigilata
        domiciliari`,
    },
    pt: {
      words: `o a os as e é um uma que de não para com você`,
      self: `eu meu minha meus minhas tenho estou sou nosso* nossa* nós`,
      HEALTH: `diagnosticad* câncer cancro tumor* quimio* diabetes diabétic* grávida gravidez aborto* medicação
        medicament* remédio* hospital internad* crônic* crónic* epilepsia asma infarto* avc demência alzheimer* parkinson*
        autismo autista* tdah doença* sintoma* alergia* alérgic* enxaqueca* deficiência* menopausa licença_médica
        atestado_médico`,
      MENTAL: `depressão depressiv* deprimid* ansiedade crise_de_ansiedade ataque_de_pânico síndrome_do_pânico burnout
        transtorno_alimentar anorexi* bulimi* bipolar* esquizofren* psicose tept trauma* psicólog* psiquiatra*
        terapeuta* terapia* antidepressiv* vício viciad* dependência_química toc`,
      SEXUALITY: `homossexua* gay lésbica* bissexua* transgênero transgénero não-binári* queer orientação_sexual
        sair_do_armário sexualidade ereção erecção`,
      RELIGION: `muçulman* islã islão islam* cristã cristão* católic* evangélic* protestante* judeu judia hindu budista*
        ateu ateia crente* religião religios* mesquita* sinagoga* ramadã ramadão`,
      MONEY: `dívida* endividad* falência falid* despejo* oficial_de_justiça nome_sujo serasa banco_alimentar`,
      LEGAL: `antecedentes_criminais ficha_criminal condenad* fui_preso fui_presa prisão penitenciária
        liberdade_condicional tornozeleira_eletrônica`,
    },
    ca: {
      words: `el la els les i és un una que de no per amb`,
      self: `jo meu meva meus meves tinc estic sóc nosaltres nostre* nostra*`,
      HEALTH: `diagnosticat* càncer tumor* quimio* diabetis embarassad* avortament* medicaci* medicament* hospital*
        crònic* epilèpsia asma infart* ictus demència alzheimer* parkinson* autisme autista* tdah malaltia* símptom*
        al·lèrgi* migranya* baixa_mèdica discapacitat* menopausa`,
      MENTAL: `depressió depressi* ansietat atac_de_pànic burnout trastorn_alimentari anorèxi* bulími* bipolar*
        esquizofrèni* psicosi trauma* psicòleg* psicòloga* psiquiatre* terapeuta* teràpia* antidepressi* addicci*`,
      SEXUALITY: `homosexual* gai lesbiana* bisexual* transgènere* no_binari* queer orientació_sexual sexualitat`,
      RELIGION: `musulman* islam* cristià cristiana catòlic* protestant* jueu jueva hindú budista* ateu atea creient*
        religió religi* mesquita* sinagoga* ramadà`,
      MONEY: `deutes endeutat* desnonament* fallida embargament*`,
      LEGAL: `antecedents_penals condemnat* detingut* presó libertat_condicional`,
    },
    gl: {
      words: `o a os as e é un unha que de non para con`,
      self: `eu meu miña meus miñas teño estou nós noso* nosa*`,
      HEALTH: `diagnosticad* cancro tumor* quimio* diabete* embarazada aborto* medicación medicamento* hospital* crónic*
        epilepsia asma infarto* ictus demencia alzheimer* parkinson* autismo enfermidade* síntoma* alerxia* xaqueca*
        discapacidade*`,
      MENTAL: `depresión depresiv* ansiedade ataque_de_pánico burnout anorexia bulimia bipolar* esquizofrenia psicose
        trauma* psicólog* psiquiatra* terapeuta* terapia* antidepresiv* adicción`,
      SEXUALITY: `homosexual* gai lesbiana* bisexual* transxénero queer orientación_sexual`,
      RELIGION: `musulmán musulmá* islam* cristián cristiá católic* xudeu xudía budista* ateo atea crente* relixión
        relixios* mesquita*`,
      MONEY: `débedas endebedad* desafiuzamento* quebra`,
      LEGAL: `antecedentes_penais condenad* detido* prisión cárcere`,
    },
    eu: {
      words: `eta da ez bat ere baina zer nola hori dut naiz`,
      self: `ni nire nik niri gure gu`,
      HEALTH: `minbizi* diabete* haurdun* abortu* botika* sendagai* ospitale* gaixotasun* gaixo* epilepsia* asma*
        alzheimer* parkinson* autismo* sintoma* alergia* migraina*`,
      MENTAL: `depresio* antsietate* larritasun* burnout* anorexia* bulimia* bipolar* eskizofreni* psikolog* psikiatra*
        terapeuta* terapia* mendekotasun*`,
      SEXUALITY: `homosexual* gay* lesbiana* bisexual* transgenero* queer*`,
      RELIGION: `musulman* islam* kristau* katoliko* judu* budista* ateo* erlijio* meskita*`,
      MONEY: `zorrak zorretan zordun* kiebra* etxegabetze*`,
      LEGAL: `kartzela* espetxe* atxilot* kondena*`,
    },
    pl: {
      words: `i w nie się jest to na że z do jak co`,
      self: `ja mój moja moje moi mam jestem byłem byłam nasz* my`,
      HEALTH: `zdiagnozowan* nowotw* rak raka rakiem guz guza guzem chemioterapi* cukrzyc* ciąż* poronien* aborcj*
        szpital* przewlekł* padaczk* epileps* astm* zawał* udar* demencj* alzheimer* parkinson* autyzm* adhd chorob*
        choroba objaw* lekarz_rodzinny alergi* migren* zwolnienie_lekarskie niepełnosprawn* menopauz*`,
      MENTAL: `depresj* stany_lękowe zaburzenia_lękowe atak_paniki ataki_paniki wypalenie_zawodowe burnout
        zaburzenia_odżywiania anoreksj* bulimi* choroba_dwubiegunowa schizofreni* psychoz* ptsd traum* psycholog*
        psychiatr* psychoterapeut* terapeut* terapi* antydepresant* uzależnien* uzależnion* odwyk* nerwic*`,
      SEXUALITY: `homoseksual* gej* lesbijk* biseksual* transpłciow* niebinarn* queer orientacja_seksualna
        orientacji_seksualnej coming_out seksualnoś* erekcj*`,
      RELIGION: `muzułman* islam* chrześcija* katolik* katolick* protestan* żyd* hindu* buddyst* ateist* wierząc*
        religi* meczet* synagog* ramadan*`,
      MONEY: `długi długów zadłużen* komornik* windykacj* upadłoś* bankructw* eksmisj* bank_żywności`,
      LEGAL: `karany karana wyrok* skazan* aresztowan* więzieni* areszt* dozór* zwolnienie_warunkowe`,
    },
    cs: {
      words: `a je to na se že v z do jak co není`,
      self: `já můj moje moji mám jsem náš naše my`,
      HEALTH: `diagnostikov* rakovin* nádor* chemoterapi* cukrovk* diabet* těhotn* potrat* lék* nemocnic* chronick*
        epilepsi* astma* infarkt* mrtvic* demenc* alzheimer* parkinson* autism* adhd nemoc* příznak* alergi* migrén*
        neschopenk* postižen* menopauz*`,
      MENTAL: `depres* úzkost* panický_atak panické_ataky vyhořen* poruchy_příjmu_potravy anorexi* bulimi* bipolár*
        schizofren* psychóz* ptsd traumat* psycholog* psychiatr* psychoterapeut* terapeut* terapi* antidepresiv*
        odvykac*`,
      SEXUALITY: `homosexuál* gay lesb* bisexuál* transgender* nebinár* queer sexuální_orientac* sexualit* erekc*`,
      RELIGION: `muslim* islám* křesťan* katolí* protestant* žid* hinduist* buddhist* ateist* věřící nábožens* mešit*
        synagog* ramadán*`,
      MONEY: `dluh* exekuc* exekutor* insolvenc* oddlužen* bankrot* vystěhován* potravinová_banka`,
      LEGAL: `trestní_rejstřík odsouzen* zatčen* vězen*`,
    },
    sk: {
      words: `a je to na sa že v z do ako čo nie`,
      self: `ja môj moja moje mám som náš naša my`,
      HEALTH: `diagnostikov* rakovin* nádor* chemoterapi* cukrovk* diabet* tehotn* potrat* liek* nemocnic* chronick*
        epilepsi* astm* infarkt* mŕtvic* demenci* alzheimer* parkinson* autizm* adhd chorob* príznak* alergi* migrén*
        postihnut* menopauz*`,
      MENTAL: `depresi* úzkost* panický_atak vyhoren* anorexi* bulimi* bipolár* schizofréni* psychóz* ptsd traum*
        psychológ* psychiater* psychoterapeut* terapeut* terapi* antidepresív*`,
      SEXUALITY: `homosexuál* gej* lesb* bisexuál* transrod* transgender* nebinár* queer sexuálna_orientácia sexualit*`,
      RELIGION: `moslim* islam* kresťan* katolí* evanjelik* žid* hinduist* budhist* ateist* veriac* nábožen* mešit*
        synagóg* ramadán*`,
      MONEY: `dlhy dlhov dlhmi zadlžen* exekúci* exekútor* osobný_bankrot insolvenc* bankrot*`,
      LEGAL: `register_trestov odsúden* zatknut* väzen* väzb*`,
    },
    sl: {
      words: `in je da na se v z za ki kaj ni`,
      self: `jaz moj moja moje imam sem naš naša`,
      HEALTH: `diagnosticiran* rak raka rakom tumor* kemoterapij* sladkorn* diabet* nosečn* splav* abortus* zdravil*
        bolnišnic* kronič* epilepsij* astm* infarkt* demenc* alzheimer* parkinson* avtizem* avtist* adhd bolezen* bolezn*
        simptom* alergij* migren* bolniška invalidnost*`,
      MENTAL: `depresij* anksioznost* tesnob* napad_panike izgorelost* anoreksij* bulimij* bipolar* shizofren* psihoz*
        ptsd travm* psiholog* psihiater* psihoterapevt* terapevt* terapij* antidepresiv* zasvojen*`,
      SEXUALITY: `homoseksual* gej* lezbijk* biseksual* transspol* nebinar* queer spolna_usmerjenost spolnost*`,
      RELIGION: `musliman* islam* kristjan* katoliš* katolik* protestant* jud juda judje judovsk* hindu* budist*
        ateist* verujoč* religij* mošej* sinagog* ramadan*`,
      MONEY: `dolgove dolgovi zadolžen* izvršb* izvršitelj* osebni_stečaj stečaj* deložacij*`,
      LEGAL: `kazenska_evidenca obsojen* aretiran* zapor*`,
    },
    hr: {
      words: `i je da na se u za što kako nije ali`,
      self: `ja moj moja moje imam sam naš naša`,
      HEALTH: `dijagnosticiran* rak raka rakom tumor* kemoterapij* dijabetes* šećern* trudn* pobačaj* abortus* lijek*
        bolnic* kroničn* epilepsij* astm* infarkt* moždani_udar demencij* alzheimer* parkinson* autizam autist* adhd
        bolest* simptom* alergij* migren* bolovanj* invaliditet* menopauz*`,
      MENTAL: `depresij* anksioznost* tjeskob* napad_panike napadi_panike izgaranj* anoreksij* bulimij* bipolarn*
        shizofren* psihoz* ptsp traum* psiholog* psihijatar* psihoterapeut* terapeut* terapij* antidepresiv* ovisnik*`,
      SEXUALITY: `homoseksual* gej* lezbijk* biseksual* transrodn* nebinarn* queer seksualna_orijentacija seksualnost*`,
      RELIGION: `musliman* islam* kršćan* katoli* pravoslav* protestant* židov* hindu* budist* ateist* vjernik* vjernic*
        religij* džamij* sinagog* ramazan*`,
      MONEY: `dugov* zadužen* ovrh* stečaj* deložacij*`,
      LEGAL: `kaznena_evidencija osuđen* uhićen* zatvor zatvoru zatvora zatvorom`,
    },
    sr: {
      words: `i je da na se u za šta kako nije и је да на се у за шта како није`,
      self: `ja moj moja moje imam sam naš naša ја мој моја моје имам сам наш наша`,
      HEALTH: `dijagnostikovan* rak raka rakom tumor* hemoterapij* dijabetes* šećern* trudn* abortus* lek lekov* bolnic*
        hronič* epilepsij* astm* infarkt* moždani_udar demencij* alchajmer* parkinson* autiz* adhd bolest* simptom*
        alergij* migren* bolovanj* дијагностикован* рак рака раком тумор* хемотерапиј* дијабетес* шећерн* трудн*
        абортус* лек лекови* болниц* хронич* епилепсиј* астм* инфаркт* деменциј* алцхајмер* паркинсон* аутиз* болест*
        симптом* алергиј* мигрен* боловањ*`,
      MENTAL: `depresij* anksioznost* napad_panike sagorevanj* anoreksij* bulimij* bipolarn* šizofren* psihoz* ptsp
        traum* psiholog* psihijatar* psihoterapeut* terapeut* terapij* antidepresiv* zavisnik* депресиј* анксиозност*
        напад_панике анорексиј* булимиј* биполарн* шизофрен* психоз* птсп траум* психолог* психијатар* психотерапеут*
        терапеут* терапиј* антидепресив* зависник*`,
      SEXUALITY: `homoseksual* gej* lezbejk* biseksual* transrodn* nebinarn* queer seksualna_orijentacija хомосексуал*
        геј* лезбејк* бисексуал* трансродн* сексуална_оријентација`,
      RELIGION: `musliman* islam* hrišćan* pravoslav* katoli* jevrej* budist* ateist* vernik* religij* džamij* sinagog*
        ramazan* муслиман* ислам* хришћан* православ* католи* јевреј* будист* атеист* верник* религиј* џамиј* синагог*
        рамазан*`,
      MONEY: `dugov* zadužen* izvršitelj* stečaj* deložacij* дугов* задужен* извршитељ* стечај*`,
      LEGAL: `krivični_dosije osuđen* uhapšen* zatvor zatvoru zatvora кривични_досије осуђен* ухапшен* затвор затвору
        затвора`,
    },
    mk: {
      words: `и е да на се во за што како не`,
      self: `јас мој моја мое имам сум наш наша`,
      HEALTH: `дијагностициран* рак ракот тумор* хемотерапиј* дијабетес* бремен* абортус* лекови болниц* хронич*
        епилепсиј* астма* инфаркт* деменциј* алцхајмер* паркинсон* аутиз* болест* симптом* алергиј* мигрен* боледување`,
      MENTAL: `депресиј* анксиозност* напад_на_паника анорексиј* булимиј* биполарн* шизофрен* психоз* траум* психолог*
        психијатар* терапевт* терапиј* антидепресив* зависник*`,
      SEXUALITY: `хомосексуал* геј* лезбијк* бисексуал* трансродов* сексуална_ориентација`,
      RELIGION: `муслиман* ислам* христијан* православ* католи* евреј* будист* атеист* верник* религиј* џамиј* рамазан*`,
      MONEY: `долгови* задолжен* извршител* стечај*`,
      LEGAL: `казнена_евиденција осуден* уапсен* затвор затворот`,
    },
    bg: {
      words: `и е да на се в за какво как не това`,
      self: `аз мой моя мое мои имам съм наш наша`,
      HEALTH: `диагностицира* рак рака тумор* химиотерапи* диабет* бремен* аборт* лекарств* болниц* хроничн* епилепси*
        астма* инфаркт* инсулт* деменци* алцхаймер* паркинсон* аутиз* болест* симптом* алерги* мигрен* болничн*
        инвалидност* менопауз*`,
      MENTAL: `депреси* тревожност* паническа_атака панически_атаки прегаряне анорекси* булими* биполярн* шизофрени*
        психоз* птср травм* психолог* психиатър* психотерапевт* терапевт* терапи* антидепресант* пристрастен*`,
      SEXUALITY: `хомосексуал* гей* лесбийк* бисексуал* транссексуал* трансджендър небинар* куиър
        сексуална_ориентация сексуалност*`,
      RELIGION: `мюсюлман* ислям* христия* православ* католи* евреин еврейк* будист* атеист* вярващ* религи* джамия*
        синагог* рамазан*`,
      MONEY: `дългове* задлъжня* съдебен_изпълнител частен_съдебен_изпълнител фалит* несъстоятелност*`,
      LEGAL: `съдимост* осъден* арестуван* затвор затвора пробация`,
    },
    ru: {
      words: `и в не на что как это с по он она но`,
      self: `я мой моя моё мое мои у_меня наш наша наши мы`,
      HEALTH: `диагноз* рак раком рака опухол* химиотерапи* диабет* беремен* выкидыш* аборт* лекарств* таблетк*
        больниц* госпитализ* хроническ* эпилепси* астм* инфаркт* инсульт* деменци* альцгеймер* паркинсон* аутиз* сдвг
        болезн* болею заболев* симптом* аллерги* мигрен* больничн* инвалид* менопауз* климакс*`,
      MENTAL: `депресси* тревожное_расстройство панические_атаки паническая_атака выгорани* расстройство_пищевого_поведения
        рпп анорекси* булими* биполярн* шизофрени* психоз* птср травм* психолог* психиатр* психотерапевт* терапевт*
        терапи* антидепрессант* наркоман* алкоголизм* алкоголик*`,
      SEXUALITY: `гей геи гомосексуал* лесбиянк* бисексуал* трансгендер* небинарн* квир* сексуальная_ориентация
        сексуальной_ориентации камин-аут сексуальност* эрекци*`,
      RELIGION: `мусульман* ислам* христиан* православн* католи* протестант* еврей* иудей* индуист* буддист* атеист*
        верующ* религи* мечет* синагог* рамадан* ураза*`,
      MONEY: `долг долги долгов долгами задолженност* коллектор* приставы пристав приставов банкротств* банкрот*
        выселени* микрозайм* просрочк*`,
      LEGAL: `судимост* осуждён* осужден* арестован* тюрьм* сизо`,
    },
    uk: {
      words: `і в не на що як це з та він вона але`,
      self: `я мій моя моє мої у_мене наш наша наші ми`,
      HEALTH: `діагноз* рак раком рака пухлин* хіміотерапі* діабет* вагітн* викидень* аборт* ліки ліків лікарськ*
        лікарн* лікар* госпіталіз* хронічн* епілепсі* астм* інфаркт* інсульт* деменці* альцгеймер* паркінсон* аутиз*
        хвороб* хворію симптом* алергі* мігрен* лікарнян* інвалідн* менопауз* клімакс*`,
      MENTAL: `депресі* тривожний_розлад панічні_атаки панічна_атака вигоранн* анорексі* булімі* біполярн* шизофрені*
        психоз* птср травм* психолог* психіатр* психотерапевт* терапевт* терапі* антидепресант* наркоман* алкоголізм*
        алкоголік*`,
      SEXUALITY: `гей геї гомосексуал* лесбійк* бісексуал* трансгендер* небінарн* квір* сексуальна_орієнтація
        сексуальність*`,
      RELIGION: `мусульман* іслам* християн* православн* католи* греко-католи* протестант* єврей* юдей* буддист* атеїст*
        віруюч* релігі* мечет* синагог* рамадан*`,
      MONEY: `борг борги боргів заборгованіст* колектор* виконавча_служба банкрутств* банкрут* виселенн* мікрокредит*
        мікропозик*`,
      LEGAL: `судимість судимості засуджен* заарештован* в'язниц* в’язниц* тюрм* сізо`,
    },
    be: {
      words: `і ў не на што як гэта з ён яна але`,
      self: `я мой мая маё мае ў_мяне наш наша мы`,
      HEALTH: `дыягназ* рак ракам пухлін* хіміятэрапі* дыябет* цяжарн* аборт* лекі лекаў бальніц* хранічн* эпілепсі*
        астм* інфаркт* інсульт* дэменцы* альцгеймер* паркінсон* аўтыз* хвароб* сімптом* алергі* мігрэн* інвалід*`,
      MENTAL: `дэпрэсі* трывожн* панічн* выгаранн* анарэксі* булімі* біпалярн* шызафрэні* псіхоз* траўм* псіхолаг*
        псіхіятр* псіхатэрапеўт* тэрапі* антыдэпрэсант* наркаман* алкагалізм*`,
      SEXUALITY: `гей геі гомасексуал* лесбіянк* бісексуал* трансгендар* квір*`,
      RELIGION: `мусульман* іслам* хрысціян* праваслаўн* каталі* габрэ* юдзе* будыст* атэіст* вернік* веруюч* рэлігі*
        мячэт* сінагог*`,
      MONEY: `доўг доўгі запазычанасц* калектар* банкруцтв* выселенн*`,
      LEGAL: `судзімасць* асуджан* арыштаван* турм*`,
    },
    el: {
      words: `και το η ο να είναι για με τι πώς δεν θα`,
      self: `εγώ μου έχω είμαι εμείς μας`,
      HEALTH: `διαγνώστηκ* καρκίν* όγκο όγκος χημειοθεραπεί* διαβήτη* έγκυος εγκυμοσύνη αποβολή άμβλωση έκτρωση φάρμακ*
        νοσοκομεί* επιληψί* άσθμα έμφραγμα εγκεφαλικό άνοια αλτσχάιμερ πάρκινσον αυτισμ* αυτιστικ* δεπυ ασθένει*
        συμπτώματ* αλλεργί* ημικρανί* αναπηρί* εμμηνόπαυση`,
      MENTAL: `κατάθλιψη καταθλιπτικ* αγχώδη_διαταραχή κρίση_πανικού κρίσεις_πανικού επαγγελματική_εξουθένωση burnout
        ανορεξί* βουλιμί* διπολικ* σχιζοφρένει* ψύχωση μετατραυματικ* τραύμα* ψυχολόγ* ψυχίατρ* ψυχοθεραπευτ*
        θεραπευτ* θεραπεί* αντικαταθλιπτικ* εθισμ*`,
      SEXUALITY: `ομοφυλόφιλ* γκέι λεσβία λεσβίες αμφιφυλόφιλ* τρανς διεμφυλ* μη_δυαδικ* queer
        σεξουαλικό_προσανατολισμό σεξουαλικός_προσανατολισμός σεξουαλικότητα στύση`,
      RELIGION: `μουσουλμάν* ισλάμ χριστιαν* ορθόδοξ* καθολικ* εβραί* βουδιστ* άθεος άθεη θρήσκ* τζαμί συναγωγή
        ραμαζάνι`,
      MONEY: `χρέη χρέος υπερχρεωμέν* δικαστικός_επιμελητής εισπρακτικ* πτώχευση πτωχεύσ* έξωση κατάσχεση`,
      LEGAL: `ποινικό_μητρώο καταδικάστηκ* συνελήφθη* φυλακ*`,
    },
    ro: {
      words: `și este în de la că nu un o pentru cu ce`,
      self: `eu meu mea mei mele am sunt nostru noastră noi`,
      HEALTH: `diagnosticat* cancer* tumor* chimioterapi* diabet* însărcinată sarcină avort* medicament* spital* cronic*
        epilepsi* astm* infarct* accident_vascular demenț* alzheimer* parkinson* autism* adhd boal* boli simptom*
        alergi* migren* concediu_medical handicap* menopauz*`,
      MENTAL: `depresi* anxietat* atac_de_panică atacuri_de_panică burnout epuizare anorexi* bulimi* bipolar*
        schizofreni* psihoz* ptsd traum* psiholog* psihiatru* psihoterapeut* terapeut* terapi* antidepresiv* alcoolic*
        drogat*`,
      SEXUALITY: `homosexual* gay lesbiană lesbiene bisexual* transgender* non-binar* queer orientare_sexuală
        sexualitat* erecți*`,
      RELIGION: `musulman* islam* creștin* ortodox* catolic* protestant* evreu evreică evrei hindus* budist* ateu atee
        credincios credincioasă religi* moschee* sinagog* ramadan*`,
      MONEY: `datorii datoriile îndatorat* executor_judecătoresc recuperare_creanțe insolvență faliment*`,
      LEGAL: `cazier* condamnat* arestat* închisoare* pușcărie* eliberare_condiționată`,
    },
    hu: {
      words: `a az és hogy nem egy is van meg de`,
      self: `én vagyok voltam lettem kaptam velem nálam`,
      HEALTH: `diagnosztizált* rák* daganat* kemoterápi* cukorbeteg* terhes* vetélés* abortusz* gyógyszer* kórház*
        krónikus* epilepszi* asztm* szívroham* agyvérzés* stroke* demenci* alzheimer* parkinson* autizmus* autista* adhd
        betegség* tünet* allergi* migrén* táppénz* fogyatékos* menopauz* klimax*`,
      MENTAL: `depresszi* szorongás* pánikroham* kiégés* evészavar* anorexi* bulimi* bipoláris* skizofrén* pszichózis*
        ptsd trauma* pszichológus* pszichiáter* pszichoterapeut* terapeut* terápi* antidepresszáns* szenvedélybeteg*
        alkoholista* drogfüggő*`,
      SEXUALITY: `homoszexuális* leszbikus* biszexuális* transznemű* nem-bináris queer szexuális_irányultság*
        szexualitás*`,
      RELIGION: `muszlim* iszlám* keresztény* katolikus* református* evangélikus* zsidó* hindu* buddhista* ateista* hívő*
        vallás* vallásos* mecset* zsinagóg* ramadán*`,
      MONEY: `adósság* tartozás* csőd* kilakoltat*`,
      LEGAL: `büntetett_előélet* elítélt* letartóztat* börtön*`,
    },
    fi: {
      words: `ja on ei se että mitä kuinka tämä mutta`,
      self: `minä minun minulla mä mun mulla meidän`,
      HEALTH: `diagnosoi* syöpä* syövän* kasvain* sytostaat* solunsalpaaj* diabete* raskaana raskaus* raskauden*
        keskenmeno* abortti* lääke* lääkäri* sairaala* krooni* epilepsia* astma* sydänkohtau* aivoinfarkti* aivohalvau*
        dementi* alzheimer* parkinson* autismi* autisti* adhd sairau* sairas* oire* allergi* migreeni* sairausloma*
        vammai* vaihdevuo*`,
      MENTAL: `masennu* masentu* ahdistu* ahdistuneisuushäiriö* paniikkikohtau* loppuunpala* burnout* syömishäiriö*
        anoreksi* bulimi* kaksisuuntai* skitsofreni* psykoosi* ptsd trauma* psykologi* psykiatri* psykoterapeut*
        terapeut* terapia* masennuslääk* addiktio* alkoholisti*`,
      SEXUALITY: `homo homoseksuaali* lesbo* biseksuaali* transsukupuoli* muunsukupuoli* ei-binääri* queer
        seksuaalinen_suuntautuminen seksuaalisuu* erektio*`,
      RELIGION: `muslimi* islam* kristitty* kristinusko* katoli* luterilai* juutalai* hindu* buddhalai* ateisti* uskova*
        uskonno* uskonto* moskei* synagog* ramadan*`,
      MONEY: `velka* velat velkojen ulosotto* maksuhäiriö* konkurssi* häätö* velkajärjestely* ruoka-apu*`,
      LEGAL: `rikosrekisteri* tuomittu* vankila* ehdonalai* valvontaranne*`,
    },
    et: {
      words: `ja on ei see et mis kuidas aga`,
      self: `mina ma minu minul mul meie`,
      HEALTH: `diagnoosi* vähk* kasvaja* keemiaravi* diabeet* rase* nurisünnitus* abort* ravim* haigla* krooni*
        epilepsi* astma* infarkt* insult* dementsus* alzheimer* parkinson* autism* adhd haigus* sümptom* allergi*
        migreen* haigusleht* puue* menopaus*`,
      MENTAL: `depressioon* ärevushäire* paanikahoo* läbipõlemi* söömishäire* anoreksi* buliimi* bipolaar* skisofreeni*
        psühhoos* ptsd trauma* psühholoog* psühhiaat* psühhoterapeu* terapeu* teraapia* antidepressan* alkohoolik*
        narkomaan*`,
      SEXUALITY: `gei* lesb* biseksuaal* transsooli* mittebinaar* queer seksuaalne_sättumus seksuaalsus*`,
      RELIGION: `moslem* islam* kristlas* katoliik* luterlas* õigeusk* juut* hindu* budist* ateist* usklik* religioon*
        mošee* sünagoog* ramadaan*`,
      MONEY: `võlg* kohtutäitur* inkasso* pankrot* maksejõuetu* väljatõst*`,
      LEGAL: `kriminaalkaristus* karistusregistr* süüdi_mõistetud vahistat* kinnipeetu* vangla*`,
    },
    lv: {
      words: `un ir ne tas kā ka par ar bet`,
      self: `es mans mana mani manas man mūsu mēs`,
      HEALTH: `diagnosticēt* vēz* audzēj* ķīmijterapij* diabēt* grūtniec* aborts aborta medikament* slimnīc* hronisk*
        epilepsij* astm* infarkt* insult* demenc* alcheimer* parkinson* autism* slimīb* simptom* alerģij* migrēn*
        slimības_lapa invaliditāt* menopauz*`,
      MENTAL: `depresij* trauksm* panikas_lēkme panikas_lēkmes izdegšan* anoreksij* bulīmij* bipolār* šizofrēnij*
        psihoz* ptsd traum* psiholog* psihiatr* psihoterapeit* terapeit* terapij* antidepresant* alkoholiķ* narkomān*`,
      SEXUALITY: `gejs* geji* lesbiet* biseksuāl* transpersona* transdzimum* nebinār* queer seksuālā_orientācija
        seksualitāt*`,
      RELIGION: `musulman* islām* kristie* katoļ* luterān* pareizticīg* ebrej* hinduist* budist* ateist* ticīg* reliģij*
        mošej* sinagog* ramadān*`,
      MONEY: `parādi parādu parādos parādnie* tiesu_izpildītāj* maksātnespēj* bankrot* izlikšan*`,
      LEGAL: `sodāmīb* notiesāt* arestēt* aizturēt* cietum*`,
    },
    lt: {
      words: `ir yra ne tai kad kaip su bet`,
      self: `aš mano mes mūsų`,
      HEALTH: `diagnozuot* vėžys vėžio vėžiu vėžį navik* chemoterapij* diabet* nėšči* persileidim* abort* vaist*
        ligonin* lėtin* epilepsij* astm* infarkt* insult* demencij* alzheimer* parkinson* autizm* liga ligos ligą ligų
        simptom* alergij* migren* nedarbingum* negalia* menopauz*`,
      MENTAL: `depresij* nerim* panikos_priepuolis panikos_priepuoliai perdegim* anoreksij* bulimij* bipolin*
        šizofrenij* psichoz* ptsd traum* psicholog* psichiatr* psichoterapeut* terapeut* terapij* antidepresant*
        alkoholik* narkoman*`,
      SEXUALITY: `gėj* lesbiet* biseksual* translyt* nebinar* queer seksualinė_orientacija seksualum*`,
      RELIGION: `musulmon* islam* krikščion* katalik* stačiatik* žydas žydė žydų induist* budist* ateist* tikinč*
        religij* mečet* sinagog* ramadan*`,
      MONEY: `skol* antstol* bankrot* nemokum* iškeldinim*`,
      LEGAL: `teistum* nuteist* suimt* kalėjim*`,
    },
    is: {
      words: `og er að ekki það á í með hvað`,
      self: `ég minn mín mitt við okkar`,
      HEALTH: `krabbamein* æxli* lyfjameðferð* sykursýki* ólétt* fósturlát* fóstureyðing* lyfja* sjúkrahús* spítal*
        langvinn* flogaveik* astma* hjartaáfall* heilablóðfall* heilabilun* alzheimer* parkinson* einhverf* adhd
        sjúkdóm* ofnæmi* mígren* veikindaleyf* fötlu* breytingaskeið*`,
      MENTAL: `þunglyndi* kvíð* ofsakvíð* kulnun* átröskun* lystarstol* lotugræðgi* geðhvörf* geðklofa* geðrof*
        áfallastreit* sálfræðing* geðlækn* sálfræðimeðferð* þunglyndislyf* fíkn* alkóhólist*`,
      SEXUALITY: `samkynhneigð* homm* lesbí* tvíkynhneigð* transkona transmaður kynsegin* hinsegin* kynhneigð*`,
      RELIGION: `múslim* íslam* kaþólsk* gyðing* búddist* trúleys* trúað* trúarbr* moska*`,
      MONEY: `skuld* vanskil* gjaldþrot* útburð*`,
      LEGAL: `sakaskrá* dæmdur dæmd handtek* fangelsi* skilorð*`,
    },
    ga: {
      words: `agus is tá an na ar le ní`,
      self: `mé mise mo agam liom ár`,
      HEALTH: `ailse* diaibéit* torrach* breith_anabaí ginmhilleadh* cógas* ospidéal* ainsealach* titimeas* asma*
        taom_croí stróc* néaltrú* alzheimer* parkinson* uathachas* galar* siomptóim* ailléirg*`,
      MENTAL: `dúlagar* imní* taom_scaoill* anorexia bulimia dépholach* scitsifréin* síceóis* tráma* síceolaí*
        síciatraí* teiripeoir* teiripe* andúil* alcólach*`,
      SEXUALITY: `aerach* leispiach* déghnéasach* trasinscneach* neamhdhénártha* queer gnéaschlaonadh*`,
      RELIGION: `moslamach* ioslam* críostaí* caitliceach* protastúnach* giúdach* búdaí* aindiach* creideamh*
        reiligiún* mosc*`,
      MONEY: `fiacha féichiúnas* féimheach* féimheacht* díshealbhú*`,
      LEGAL: `taifead_coiriúil ciontaithe príosún*`,
    },
    cy: {
      words: `a yw mae y yr ac ar gyda ddim`,
      self: `fi fy ein mae_gen_i gen_i dw_i rydw_i`,
      HEALTH: `canser* tiwmor* cemotherapi* diabetes clefyd_siwgr beichiog* camesgoriad* erthyliad* meddyginiaeth*
        moddion ysbyty* cronig* epilepsi* asthma trawiad_ar_y_galon strôc dementia alzheimer* parkinson* awtistiaeth
        awtistig adhd salwch* clefyd* symptom* alergedd* meigryn* anabledd* menopos*`,
      MENTAL: `iselder* gorbryder* pwl_o_banig gorflinder* anorecsia bwlimia deubegwn* sgitsoffrenia seicosis ptsd
        trawma* seicolegydd* seiciatrydd* therapydd* therapi* gwrthiselyddion caethiwed* alcoholig*`,
      SEXUALITY: `hoyw* lesbiad* deurywiol* trawsryweddol* anneuaidd* cwiar* queer cyfeiriadedd_rhywiol rhywioldeb*`,
      RELIGION: `mwslim* islam* cristion* catholig* protestan* iddew* hindŵ bwdhydd* anffyddiwr* crefydd* mosg* synagog*
        ramadan`,
      MONEY: `dyled* beili* methdal* troi_allan banc_bwyd`,
      LEGAL: `cofnod_troseddol euog* arestio* arestiwyd carchar*`,
    },
    mt: {
      words: `u huwa hija il ta li ma f għal`,
      self: `jien tiegħi tagħna aħna għandi ninsab`,
      HEALTH: `dijanjostikat* kanċer* tumur* kemjoterapija dijabete* tqala korriment* abort* mediċin* sptar* kronik*
        epilessija ażma attakk_tal-qalb puplesija dimenzja alzheimer* parkinson* awtiżmu awtistiku mard* sintom*
        allerġij* diżabilit* menopawsa`,
      MENTAL: `depressjoni* ansjetà attakk_ta'_paniku attakk_ta’_paniku burnout anoreksja bulimja bipolari*
        skizofrenija psikożi trawma* psikologu* psikjatra* terapista* terapija* antidepressanti* addikt* alkoħoliku`,
      SEXUALITY: `omosesswal* gay lesbjana* bisesswal* transġeneru* queer orjentazzjoni_sesswali sesswalità`,
      RELIGION: `musulman* iżlam* nisrani* kattoliku* kattolika* lhudi* lhud* buddist* ateu ateja reliġjon* moskea*`,
      MONEY: `djun falliment* żgumbrament*`,
      LEGAL: `fedina_penali kkundannat* arrestat* ħabs`,
    },
    sq: {
      words: `dhe është në një që për me nuk`,
      self: `unë im ime imi time tim kam jam ne ynë jonë`,
      HEALTH: `diagnostikuar* kancer* tumor* kimioterapi* diabet* shtatzënë shtatzëni* abort* ilaç* barna spital*
        kronik* epilepsi* astm* infarkt* goditje_në_tru demenc* alzheimer* parkinson* autiz* sëmundj* simptom* alergji*
        migren* aftësi_të_kufizuara menopauz*`,
      MENTAL: `depresion* ankth* sulm_paniku sulme_paniku djegie_profesionale burnout anoreksi* bulimi* bipolar*
        skizofreni* psikoz* ptsd traum* psikolog* psikiatër* psikiatr* psikoterapeut* terapist* terapi* antidepresiv*
        alkoolik* narkoman*`,
      SEXUALITY: `homoseksual* gej* lezbike* biseksual* transgjinor* jo-binar* queer orientim_seksual seksualitet*`,
      RELIGION: `mysliman* musliman* islam* krishter* katolik* ortodoks* hebre* çifut* budist* ateist* besimtar* fetar*
        xhami* ramazan*`,
      MONEY: `borxh* përmbarues* falimentim* dëbim*`,
      LEGAL: `dënuar arrestuar* burg*`,
    },
    nb: {
      words: `og er det i på ikke som en til hva har`,
      self: `jeg meg mitt mine vi oss vår vårt våre`,
      HEALTH: `diagnostisert* kreft* svulst* cellegift* diabetes gravid* spontanabort* abort* medisin* sykehus* kronisk*
        epilepsi* astma hjerteinfarkt* hjerneslag* demens* alzheimer* parkinson* autisme autist* adhd sykdom* symptom*
        allergi* migrene* sykemeld* uføre* funksjonshem* overgangsalder*`,
      MENTAL: `depresjon* deprimert* angstlidelse* angst panikkanfall* utbrent* utbrenthet spiseforstyrrelse* anoreksi*
        bulimi* bipolar* schizofreni* psykose* ptsd traume* psykolog* psykiater* psykoterapeut* terapeut* terapi*
        antidepressiva rusmisbruk* rusavhengig* alkoholiker*`,
      SEXUALITY: `homofil* homo lesbisk* bifil* skeiv* transperson* transkjønn* ikke-binær* queer legning*
        seksuell_orientering seksualitet*`,
      RELIGION: `muslim* islam* kristen* katolsk* protestant* jødisk* jøde hindu* buddhist* ateist* troende religion*
        religiøs* moské* synagoge* ramadan*`,
      MONEY: `gjeld gjelden gjeldsrådgiv* gjeldsordning* inkasso* namsmann* utpanting* konkurs* utkastelse* matbank*`,
      LEGAL: `rulleblad* straffedømt* dømt* arrestert* pågrepet* fengsel* prøveløslat*`,
    },
    da: {
      words: `og er det i på ikke som en til hvad har`,
      self: `jeg mig mit mine vi os vores`,
      HEALTH: `diagnosticeret* kræft* svulst* kemoterapi* diabetes sukkersyge gravid* abort* medicin* sygehus* hospital*
        kronisk* epilepsi* astma hjerteanfald* blodprop* demens* alzheimer* parkinson* autisme autist* adhd sygdom*
        symptom* allergi* migræne* sygemeld* handicap* overgangsalder*`,
      MENTAL: `depression* deprimeret angst* panikanfald* udbrændt* spiseforstyrrelse* anoreksi* bulimi* bipolar*
        skizofreni* psykose* ptsd traume* psykolog* psykiater* psykoterapeut* terapeut* terapi* antidepressiv* misbrug*
        alkoholiker*`,
      SEXUALITY: `homoseksuel* bøsse* lesbisk* biseksuel* transkønnet* nonbinær* queer seksuel_orientering seksualitet*`,
      RELIGION: `muslim* islam* kristen* katolsk* jødisk* jøde hindu* buddhist* ateist* troende religion* religiøs*
        moské* synagoge* ramadan*`,
      MONEY: `gæld* inkasso* fogedret* konkurs*`,
      LEGAL: `straffeattest* dømt* anholdt* arresteret* fængsel* fængslet* prøveløsladt*`,
    },
    sv: {
      words: `och är det i på inte som en till vad har`,
      self: `jag mig mitt mina vi oss vår vårt våra`,
      HEALTH: `diagnostiserad* cancer* tumör* cellgift* diabetes gravid* missfall* abort* medicin* läkemedel* sjukhus*
        kronisk* epilepsi* astma hjärtinfarkt* stroke demens* alzheimer* parkinson* autism* autist* adhd sjukdom*
        symptom* allergi* migrän* sjukskriv* funktionsnedsättning* klimakteri*`,
      MENTAL: `depression* deprimerad* ångest* panikattack* utbränd* utmattningssyndrom* ätstörning* anorexi* bulimi*
        bipolär* schizofreni* psykos* ptsd trauma* psykolog* psykiater* psykoterapeut* terapeut* terapi* antidepressiv*
        missbruk* alkoholist*`,
      SEXUALITY: `homosexuell* bög* lesbisk* bisexuell* transperson* ickebinär* icke-binär* queer sexuell_läggning
        sexualitet*`,
      RELIGION: `muslim* islam* kristen* katolsk* judisk* jude hindu* buddhist* ateist* troende religion* religiös*
        moské* synagoga* ramadan*`,
      MONEY: `skulder skuld* kronofogd* inkasso* konkurs* vräkning* skuldsanering*`,
      LEGAL: `brottsregist* belastningsregist* dömd* gripen* anhållen* häktad* fängelse*`,
    },
    lb: {
      words: `an ass net mat den fir wéi wat ech`,
      self: `ech mäin meng mäi eis mir`,
      HEALTH: `diagnostizéiert* kriibs* tumor* chemo* diabetes schwanger* ofdreiwung* medikament* spidol* chronesch*
        epilepsie* asthma häerzinfarkt* schlagufall* demenz* alzheimer* parkinson* autismus* krankheet* symptom*
        allergi* migrän* krankeschäin*`,
      MENTAL: `depressioun* angscht* panikattack* burnout* anorexie* bulimie* bipolar* schizophren* psychos* trauma*
        psycholog* psychiater* therapeut* therapie* antidepressiv*`,
      SEXUALITY: `homosexuell* schwul* lesbesch* bisexuell* transgender* queer sexuell_orientéierung`,
      RELIGION: `moslem* muslim* islam* chrëschtlech* kathoulesch* jiddesch* buddhist* atheist* relioun* moschee*`,
      MONEY: `scholden* gerichtsviollzéier* faillite*`,
      LEGAL: `veruerteelt* verhaft* prisong*`,
    },
    fy: {
      words: `en is it de net op yn mei wat`,
      self: `ik myn wy ús`,
      HEALTH: `kanker* tumor* chemo* diabetes abortus* medisyn* sikehûs* chronysk* epilepsy* astma hertoanfal* beroerte
        dementy* alzheimer* parkinson* autisme sykte* symptoom* allergy*`,
      MENTAL: `depresje* depressy* eangst* panykoanfal* burn-out* anorexia bulimia bipolêr* skizofreny* psychos* trauma*
        psycholooch* psychiater* terapeut* terapy* ferslaafd*`,
      SEXUALITY: `homo homoseksueel* lesbysk* biseksueel* transgender* queer`,
      RELIGION: `moslim* islam* kristen* katolyk* joadsk* boeddhist* ateïst* religy* moskee*`,
      MONEY: `skulden* deurwaarder* fallisemint*`,
      LEGAL: `strafblêd* feroardiele* arrestearre* finzenis*`,
    },
    af: {
      words: `en is die nie het 'n van wat hoe`,
      self: `ek my myne ons`,
      HEALTH: `gediagnoseer* kanker* chemo* diabetes suikersiekte swanger* miskraam* aborsie* medikasie* medisyne*
        hospitaal* chroniese* kroniese* epilepsie asma hartaanval* beroerte demensie* alzheimer* parkinson* outisme
        outisties* adhd siekte* simptoom* simptome allergie* migraine* siekverlof* gestremd* menopouse*`,
      MENTAL: `depressie* depressief* angsversteuring* paniekaanval* uitbranding* eetversteuring* anoreksie* boulimie*
        bipolêr* skisofrenie* psigose* ptsv trauma* sielkundige* psigiater* terapeut* terapie* antidepressant* verslaaf*
        alkoholis*`,
      SEXUALITY: `gay homoseksueel* lesbies* biseksueel* transgender* nie-binêr* queer seksuele_oriëntasie seksualiteit*`,
      RELIGION: `moslem* islam* christen* katoliek* protestant* joods* jood hindoe* boeddhis* ateïs* gelowig*
        godsdiens* moskee* sinagoge* ramadan*`,
      MONEY: `skuld* balju* skuldeiser* bankrot* insolvent* uitsetting*`,
      LEGAL: `kriminele_rekord strafregister* skuldig_bevind gearresteer* tronk* gevangenis* parool*`,
    },

    // ---------- Turks, Kaukasus en Centraal-Azië ----------
    tr: {
      words: `ve bir bu ne için ile da de mı mi değil var`,
      self: `ben benim bende bizim biz`,
      HEALTH: `teşhis* kanser* tümör* kemoterapi* diyabet* şeker_hastası* hamile* gebe* düşük_yaptı* kürtaj* ilaç*
        hastane* kronik* epilepsi* sara_hastalığı astım* kalp_krizi* felç* demans* alzheimer* parkinson* otizm* otistik*
        dehb hastalı* hasta* alerji* migren* engelli* menopoz*`,
      MENTAL: `depresyon* bunalım* anksiyete* kaygı_bozukluğu* panik_atak* tükenmişlik* yeme_bozukluğu* anoreksi*
        bulimi* bipolar* şizofreni* psikoz* tssb travma* psikolog* psikiyatr* terapist* terapi* antidepresan*
        uyuşturucu_bağımlı* alkolik*`,
      SEXUALITY: `eşcinsel* gey* lezbiyen* biseksüel* trans_birey* transseksüel* non-binary queer cinsel_yönelim*
        cinsellik*`,
      RELIGION: `müslüman* islam* hristiyan* katolik* ortodoks* yahudi* budist* ateist* deist* inançlı* dindar* cami*
        ramazan* oruç*`,
      MONEY: `borç* haciz* iflas* konkordato* tahliye* kredi_kartı_borcu`,
      LEGAL: `sabıka* hüküm_giy* mahkum* tutukla* gözaltı* hapis* hapse* hapiste cezaevi* şartlı_tahliye`,
    },
    az: {
      words: `və bir bu nə üçün ilə da də deyil var`,
      self: `mən mənim biz bizim`,
      HEALTH: `diaqnoz* xərçəng* kimyaterapiya* diabet* şəkər_xəstəliyi hamilə* abort* dərman* xəstəxana* xroniki*
        epilepsiya* astma* infarkt* insult* demensiya* alzheymer* parkinson* autizm* xəstəli* xəstə* simptom* allergiya*
        miqren* əlil*`,
      MENTAL: `depressiya* panik_atak* tükənmişlik* anoreksiya* bulimiya* bipolyar* şizofreniya* psixoz* travma*
        psixoloq* psixiatr* terapevt* terapiya* antidepressant* narkoman* alkoqolik*`,
      SEXUALITY: `homoseksual* gey* lezbiyan* biseksual* transgender* queer cinsi_oriyentasiya`,
      RELIGION: `müsəlman* islam* xristian* katolik* yəhudi* budist* ateist* dindar* məscid* ramazan* oruc*`,
      MONEY: `borc* icra_məmuru iflas* müflis*`,
      LEGAL: `məhkum* həbs* cinayət_məsuliyyəti`,
    },
    kk: {
      words: `және бұл не үшін да де емес бар`,
      self: `мен менің біз біздің`,
      HEALTH: `диагноз* қатерлі_ісік* ісік* химиотерапия* диабет* қант_диабеті жүкті* түсік* аборт* дәрі* аурухана*
        созылмалы* эпилепсия* астма* инфаркт* инсульт* деменция* альцгеймер* паркинсон* аутизм* ауру* симптом*
        аллергия* мигрен* мүгедек*`,
      MENTAL: `депрессия* мазасыздық* күйзеліс* анорексия* булимия* биполяр* шизофрения* психоз* жарақат* психолог*
        психиатр* терапевт* терапия* антидепрессант* нашақор* маскүнем*`,
      SEXUALITY: `гей* лесбиян* бисексуал* трансгендер* гомосексуал* жыныстық_бағдар*`,
      RELIGION: `мұсылман* ислам* христиан* православ* католик* еврей* буддист* атеист* діндар* мешіт* ораза* рамазан*`,
      MONEY: `қарыз* банкрот* сот_орындаушы* коллектор*`,
      LEGAL: `сотталған* тұтқындал* түрме* қамау*`,
    },
    uz: {
      words: `va bu nima uchun ham emas bilan bor`,
      self: `men mening biz bizning`,
      HEALTH: `tashxis* saraton* o'sma* o‘sma* kimyoterapiya* diabet* qandli_diabet homilador* abort* dori* kasalxona*
        shifoxona* surunkali* epilepsiya* astma* infarkt* insult* demensiya* altsgeymer* parkinson* autizm* kasal*
        simptom* allergiya* migren* nogiron*`,
      MENTAL: `depressiya* tushkunlik* anoreksiya* bulimiya* bipolyar* shizofreniya* psixoz* travma* psixolog*
        psixiatr* terapevt* terapiya* antidepressant* giyohvand* alkogolik*`,
      SEXUALITY: `gey* lesbiyan* biseksual* transgender* gomoseksual* jinsiy_moyillik*`,
      RELIGION: `musulmon* islom* nasroniy* xristian* katolik* yahudiy* buddist* ateist* dindor* masjid* ramazon*
        ro'za* ro‘za*`,
      MONEY: `qarz* bankrot* sud_ijrochisi* kollektor*`,
      LEGAL: `sudlangan* hibsga* qamoq*`,
    },
    mn: {
      words: `ба энэ юу нь гэж биш бол`,
      self: `би миний бид бидний`,
      HEALTH: `онош* хорт_хавдар* хавдар* химийн_эмчилгээ чихрийн_шижин жирэмсэн* үр_хөндөлт* эмнэлэг* архаг* эпилепси*
        астма* зүрхний_шигдээс* харвалт* деменци* альцгеймер* паркинсон* аутизм* өвчин* өвчтэй харшил* мигрень*
        хөгжлийн_бэрхшээл*`,
      MENTAL: `сэтгэл_гутрал* түгшүүр* сандрал* анорекси* булими* хоёр_туйлт шизофрени* психоз* сэтгэл_зүйч*
        сэтгэцийн_эмч* сэтгэл_засал* донтолт* архичин*`,
      SEXUALITY: `гей* лесби* бисексуал* трансжендер* ижил_хүйст*`,
      RELIGION: `лалын_шашин* мусульман* христ* католик* еврей* буддын* шашин* атеист* сүсэгтэн*`,
      MONEY: `өртэй өрийн зээлийн_өр дампуур*`,
      LEGAL: `ял_эдэлсэн ялтан* баривчлагд* шорон* хорих*`,
    },
    ka: {
      words: `და არის არა რა როგორ ეს მაგრამ`,
      self: `მე ჩემი ჩემს ჩვენ ჩვენი მაქვს ვარ`,
      HEALTH: `დიაგნოზ* კიბო* სიმსივნ* ქიმიოთერაპი* დიაბეტ* ორსულ* აბორტ* მედიკამენტ* წამალ* საავადმყოფო* ქრონიკულ*
        ეპილეფსი* ასთმ* ინფარქტ* ინსულტ* დემენცი* ალცჰეიმერ* პარკინსონ* აუტიზმ* დაავადებ* სიმპტომ* ალერგი* შაკიკ*
        შეზღუდული_შესაძლებლობ*`,
      MENTAL: `დეპრესი* შფოთვ* პანიკური_შეტევ* გადაწვ* ანორექსი* ბულიმი* ბიპოლარ* შიზოფრენი* ფსიქოზ* ტრავმ*
        ფსიქოლოგ* ფსიქიატრ* ფსიქოთერაპევტ* თერაპევტ* თერაპი* ანტიდეპრესანტ* ნარკომან* ალკოჰოლიკ*`,
      SEXUALITY: `გეი* ლესბოსელ* ბისექსუალ* ტრანსგენდერ* ჰომოსექსუალ* სექსუალური_ორიენტაცი* queer`,
      RELIGION: `მუსლიმ* ისლამ* ქრისტიან* მართლმადიდებ* კათოლიკ* ებრაელ* ბუდისტ* ათეისტ* მორწმუნე* რელიგი* მეჩეთ*
        სინაგოგ* რამადან*`,
      MONEY: `ვალი ვალები ვალებს ვალში გაკოტრებ* ბანკროტ* გამოსახლებ*`,
      LEGAL: `ნასამართლ* მსჯავრდებ* დააპატიმრ* ციხ*`,
    },
    hy: {
      words: `և է չէ ինչ ինչպես այս բայց`,
      self: `ես իմ մենք մեր ունեմ`,
      HEALTH: `ախտորոշ* քաղցկեղ* ուռուցք* քիմիաթերապի* շաքարախտ* դիաբետ* հղի* վիժում* աբորտ* դեղեր դեղորայք*
        դեղամիջոց* հիվանդանոց* քրոնիկ* էպիլեպսի* ասթմա* ինֆարկտ* ինսուլտ* դեմենցի* ալցհեյմեր* պարկինսոն* աուտիզմ*
        հիվանդ* ախտանիշ* ալերգի* միգրեն* հաշմանդամ*`,
      MENTAL: `դեպրեսի* անհանգստ* խուճապի_նոպա* անորեքսի* բուլիմի* երկբևեռ* շիզոֆրենի* փսիխոզ* տրավմա* հոգեբան*
        հոգեբույժ* թերապևտ* թերապի* հակադեպրեսանտ* թմրամոլ* ալկոհոլիկ*`,
      SEXUALITY: `գեյ* լեսբուհի* բիսեքսուալ* տրանսգենդեր* համասեռամոլ* սեռական_կողմնորոշ*`,
      RELIGION: `մուսուլման* իսլամ* քրիստոնյա* կաթոլիկ* հրեա* բուդդայ* աթեիստ* հավատացյալ* կրոն* մզկիթ* սինագոգ*
        ռամադան*`,
      MONEY: `պարտք* սնանկ* վտարում*`,
      LEGAL: `դատվածություն* դատապարտվ* ձերբակալ* բանտ*`,
    },

    // ---------- Midden-Oosten en Zuid-Azië ----------
    ar: {
      words: `في من على أن هذا ما لا هل عن مع`,
      self: `أنا انا لدي عندي نحن لدينا عندنا أعاني زوجي زوجتي ابني ابنتي أمي أبي`,
      HEALTH: `تشخيص* سرطان* ورم* أورام كيماوي* علاج_كيميائي سكري* السكري حامل* إجهاض* أدوية* دواء* مستشفى* مزمن* صرع*
        ربو* نوبة_قلبية جلطة* خرف* الزهايمر* باركنسون* التوحد* مرض* أعراض* صداع_نصفي إعاقة* انقطاع_الطمث`,
      MENTAL: `اكتئاب* اضطراب_القلق نوبة_هلع نوبات_هلع احتراق_وظيفي اضطراب_الأكل فقدان_الشهية_العصبي الشره_المرضي
        ثنائي_القطب فصام* ذهان* اضطراب_ما_بعد_الصدمة أخصائي_نفسي طبيب_نفسي معالج_نفسي علاج_نفسي مضادات_الاكتئاب إدمان*
        مدمن*`,
      SEXUALITY: `مثلي_الجنس مثلية_الجنس مثليين مثليات سحاقي* مزدوج_الميول متحول_جنسي* متحولة_جنسي* عابر_جنسي*
        التوجه_الجنسي ميول_جنسية`,
      RELIGION: `مسلم* إسلام* مسيحي* كاثوليك* قبطي* يهودي* بوذي* ملحد* متدين* مسجد* كنيسة* رمضان* صيام*`,
      MONEY: `ديون* مديون* إفلاس* مفلس* تحصيل_ديون طرد_من_المنزل`,
      LEGAL: `سجل_جنائي سوابق* محكوم* اعتقال* اعتقلت* سجن* معتقل* إفراج_مشروط`,
    },
    he: {
      words: `של את על זה לא מה איך עם גם`,
      self: `אני שלי אנחנו שלנו יש_לי`,
      HEALTH: `אובחנ* סרטן* כימותרפי* סוכרת* הריון בהריון הפלה* תרופות* תרופה* בית_חולים אשפוז* כרוני* אפילפסי* אסתמה*
        התקף_לב שבץ* דמנצי* אלצהיימר* פרקינסון* אוטיזם* אוטיסט* מחלה* מחלת* תסמינ* אלרגי* מיגרנה* נכות* גיל_המעבר`,
      MENTAL: `דיכאון* חרדה* התקף_חרדה התקפי_חרדה התקף_פאניקה שחיקה* הפרעת_אכילה אנורקסי* בולימי* דו-קוטבי*
        סכיזופרני* פסיכוזה* פוסט_טראומה טראומה* פסיכולוג* פסיכיאטר* פסיכותרפ* טיפול_פסיכולוגי תרופות_נוגדות_דיכאון
        התמכרות* מכור*`,
      SEXUALITY: `הומו* לסבית* ביסקסואל* טרנסג'נדר* טרנסג׳נדר* טרנסית לא-בינארי* קוויר* נטייה_מינית מיניות`,
      RELIGION: `מוסלמי* איסלאם* נוצרי* קתולי* יהודי* דתי* חרדי* חוזר_בתשובה בודהיסט* אתאיסט* מסגד* רמדאן*`,
      MONEY: `חובות* הוצאה_לפועל פשיטת_רגל פושט_רגל עיקול*`,
      LEGAL: `רישום_פלילי עבר_פלילי הורשע* כלא* מאסר* עבודות_שירות`,
    },
    fa: {
      words: `و در به از این که است را با`,
      self: `من ما دارم هستم`,
      HEALTH: `تشخیص* سرطان* تومور* شیمی_درمانی دیابت* قند_خون باردار* حاملگی* سقط* دارو* بیمارستان* مزمن* صرع* آسم*
        سکته* زوال_عقل آلزایمر* پارکینسون* اوتیسم* بیماری* بیمار* میگرن* معلولیت* یائسگی*`,
      MENTAL: `افسردگی* افسرده* اضطراب* حمله_پانیک حملات_پانیک فرسودگی_شغلی اختلال_خوردن دوقطبی* اسکیزوفرنی*
        روان‌پریشی* تروما* روانشناس* روان‌شناس* روانپزشک* روان‌پزشک* روان‌درمان* داروی_ضدافسردگی اعتیاد* معتاد*`,
      SEXUALITY: `همجنسگرا* همجنس‌گرا* لزبین* دوجنسگرا* ترنس* تراجنسیتی* گرایش_جنسی`,
      RELIGION: `مسلمان* اسلام* مسیحی* کاتولیک* یهودی* بهائی* زرتشتی* بودایی* ملحد* بی‌دین* مذهبی* مسجد* رمضان*`,
      MONEY: `بدهی* قرض* ورشکست* طلبکار*`,
      LEGAL: `سوء_پیشینه سابقه_کیفری محکوم* بازداشت* زندان* آزادی_مشروط`,
    },
    ur: {
      words: `اور ہے کی کے میں یہ کیا نہیں سے`,
      self: `میں میرا میری میرے ہم ہمارا ہماری`,
      HEALTH: `تشخیص* کینسر* سرطان* رسولی* کیموتھراپی* ذیابیطس* حاملہ* اسقاط* دوائی* دوا* ہسپتال* اسپتال* دائمی* مرگی*
        دمہ* ہارٹ_اٹیک دل_کا_دورہ فالج* ڈیمنشیا* الزائمر* پارکنسن* آٹزم* بیماری* بیمار* الرجی* درد_شقیقہ معذور*`,
      MENTAL: `ڈپریشن* افسردگی* بے_چینی* اضطراب* پینک_اٹیک گھبراہٹ* کھانے_کی_خرابی بائی_پولر* شیزوفرینیا* نفسیاتی*
        صدمہ* ماہر_نفسیات سائیکالوجسٹ* سائیکاٹرسٹ* تھراپسٹ* تھراپی* نشہ*`,
      SEXUALITY: `ہم_جنس_پرست* لیسبین* ٹرانس_جینڈر* خواجہ_سرا* جنسی_رجحان`,
      RELIGION: `مسلمان* اسلام* عیسائی* مسیحی* کیتھولک* یہودی* ہندو* سکھ* احمدی* قادیانی* بدھ_مت ملحد* مذہبی* مسجد*
        رمضان* روزہ*`,
      MONEY: `قرض* قرضہ* دیوالیہ*`,
      LEGAL: `مجرمانہ_ریکارڈ سزا_یافتہ گرفتار* جیل* قید*`,
    },
    ps: {
      words: `او په د دی چې څه نه سره`,
      self: `زه زما موږ زموږ`,
      HEALTH: `سرطان* کینسر* شکر_ناروغي حامله* دوا* درمل* روغتون* شفاخان* ناروغ* مرګی*`,
      MENTAL: `خپګان* اضطراب* رواني* ارواپوه* روږدي* نشه*`,
      SEXUALITY: `همجنسباز* همجنس_ګرا*`,
      RELIGION: `مسلمان* اسلام* عیسوي* مسیحي* یهودي* هندو* سکه* ملحد* جومات* روژه*`,
      MONEY: `پورونه پوروړی* پور_لرم افلاس*`,
      LEGAL: `زندان* محکوم* نیول_شوی`,
    },
    ku: {
      words: `û di de ji ev çi ne و لە بە ئەم چی`,
      self: `ez min em من ئێمە`,
      HEALTH: `kanser* penceşêr* ducanî* derman* nexweşxane* nexweş* شێرپەنجە* نەخۆش* دەرمان* نەخۆشخانە* سکپڕ*`,
      MENTAL: `depresyon* psîkolog* terapî* خەمۆکی* دەروونی*`,
      SEXUALITY: `homoseksuel* gey* lezbiyen* هاوڕەگەزباز*`,
      RELIGION: `misilman* îslam* xiristiyan* cihû* êzîdî* ateîst* mizgeft* موسڵمان* ئیسلام* مەسیحی* جولەکە* ئێزیدی*
        مزگەوت*`,
      MONEY: `deyn* قەرز*`,
      LEGAL: `girtîgeh* زیندان* گیراو*`,
    },
    hi: {
      words: `और है के की में यह क्या नहीं से को`,
      self: `मैं मेरा मेरी मेरे हम हमारा हमारी`,
      HEALTH: `निदान* कैंसर* कर्क_रोग ट्यूमर* कीमोथेरेपी* कीमो* मधुमेह* डायबिटीज* शुगर_की_बीमारी गर्भवती* प्रेग्नेंट* गर्भपात*
        दवा* दवाई* अस्पताल* हॉस्पिटल* पुरानी_बीमारी मिर्गी* अस्थमा* दमा* दिल_का_दौरा हार्ट_अटैक लकवा* स्ट्रोक* डिमेंशिया*
        अल्जाइमर* पार्किंसंस* ऑटिज्म* ऑटिज़्म* बीमारी* बीमार* एलर्जी* माइग्रेन* विकलांग* दिव्यांग* रजोनिवृत्ति* मेनोपॉज*`,
      MENTAL: `अवसाद* डिप्रेशन* एंग्जायटी* पैनिक_अटैक बर्नआउट* एनोरेक्सिया* बुलिमिया* बाइपोलर* सिज़ोफ्रेनिया* सिजोफ्रेनिया*
        मनोविकृति* आघात* मनोवैज्ञानिक* मनोचिकित्सक* साइकोलॉजिस्ट* साइकेट्रिस्ट* थेरेपिस्ट* थेरेपी* एंटीडिप्रेसेंट* नशे_की_लत
        लत नशा*`,
      SEXUALITY: `समलैंगिक* गे लेस्बियन* उभयलिंगी* बाइसेक्सुअल* ट्रांसजेंडर* किन्नर* यौन_अभिविन्यास सेक्सुअलिटी*`,
      RELIGION: `मुस्लिम* मुसलमान* इस्लाम* ईसाई* क्रिश्चियन* कैथोलिक* यहूदी* हिंदू* हिन्दू* सिख* जैन* बौद्ध* नास्तिक*
        धार्मिक* मस्जिद* गुरुद्वारा*`,
      MONEY: `कर्ज* क़र्ज़* कर्ज़* दिवालिया* वसूली_एजेंट बेदखली*`,
      LEGAL: `आपराधिक_रिकॉर्ड सजायाफ्ता सजा_हुई गिरफ्तार* गिरफ़्तार* जेल* कैद* ज़मानत* जमानत*`,
    },
    bn: {
      words: `এবং আর হয় কি না এই এটা থেকে`,
      self: `আমি আমার আমরা আমাদের`,
      HEALTH: `রোগ_নির্ণয় ক্যান্সার* টিউমার* কেমোথেরাপি* ডায়াবেটিস* গর্ভবতী* গর্ভপাত* ওষুধ* হাসপাতাল* মৃগী* হাঁপানি*
        অ্যাজমা* হার্ট_অ্যাটাক স্ট্রোক* ডিমেনশিয়া* আলঝেইমার* পারকিনসন* অটিজম* রোগ* অসুখ* অসুস্থ* উপসর্গ* অ্যালার্জি*
        মাইগ্রেন* প্রতিবন্ধী* মেনোপজ*`,
      MENTAL: `বিষণ্ণতা* বিষন্নতা* ডিপ্রেশন* উদ্বেগ* প্যানিক_অ্যাটাক বার্নআউট* অ্যানোরেক্সিয়া* বাইপোলার* সিজোফ্রেনিয়া*
        মানসিক_রোগ মনোবিজ্ঞানী* মনোরোগ_বিশেষজ্ঞ সাইকোলজিস্ট* সাইকিয়াট্রিস্ট* থেরাপিস্ট* থেরাপি* মাদকাসক্ত* আসক্ত*
        নেশা*`,
      SEXUALITY: `সমকামী* গে লেসবিয়ান* উভকামী* ট্রান্সজেন্ডার* হিজড়া* যৌন_অভিমুখিতা`,
      RELIGION: `মুসলিম* মুসলমান* ইসলাম* খ্রিস্টান* ক্যাথলিক* ইহুদি* হিন্দু* বৌদ্ধ* নাস্তিক* ধার্মিক* মসজিদ* রমজান* রোজা*`,
      MONEY: `ঋণ* দেউলিয়া* উচ্ছেদ*`,
      LEGAL: `অপরাধমূলক_রেকর্ড দণ্ডিত* গ্রেফতার* গ্রেপ্তার* জেল* কারাগার* জামিন*`,
    },
    pa: {
      words: `ਅਤੇ ਹੈ ਦੇ ਦੀ ਵਿੱਚ ਕੀ ਨਹੀਂ ਨੂੰ`,
      self: `ਮੈਂ ਮੇਰਾ ਮੇਰੀ ਮੇਰੇ ਅਸੀਂ ਸਾਡਾ ਸਾਡੀ`,
      HEALTH: `ਕੈਂਸਰ* ਟਿਊਮਰ* ਸ਼ੂਗਰ_ਦੀ_ਬਿਮਾਰੀ ਡਾਇਬਟੀਜ਼* ਗਰਭਵਤੀ* ਗਰਭਪਾਤ* ਦਵਾਈ* ਹਸਪਤਾਲ* ਮਿਰਗੀ* ਦਮਾ* ਦਿਲ_ਦਾ_ਦੌਰਾ ਅਧਰੰਗ*
        ਬਿਮਾਰੀ* ਬਿਮਾਰ* ਐਲਰਜੀ* ਅਪਾਹਜ*`,
      MENTAL: `ਡਿਪਰੈਸ਼ਨ* ਪੈਨਿਕ_ਅਟੈਕ ਮਾਨਸਿਕ_ਰੋਗ ਮਨੋਵਿਗਿਆਨੀ* ਥੈਰੇਪੀ* ਥੈਰੇਪਿਸਟ* ਨਸ਼ਾ* ਨਸ਼ੇ*`,
      SEXUALITY: `ਸਮਲਿੰਗੀ* ਗੇ ਲੈਸਬੀਅਨ* ਟਰਾਂਸਜੈਂਡਰ* ਕਿੰਨਰ*`,
      RELIGION: `ਮੁਸਲਮਾਨ* ਮੁਸਲਿਮ* ਇਸਲਾਮ* ਈਸਾਈ* ਹਿੰਦੂ* ਸਿੱਖ* ਬੋਧੀ* ਨਾਸਤਿਕ* ਅੰਮ੍ਰਿਤਧਾਰੀ* ਮਸਜਿਦ* ਗੁਰਦੁਆਰ*`,
      MONEY: `ਕਰਜ਼* ਕਰਜ* ਦੀਵਾਲੀਆ*`,
      LEGAL: `ਗ੍ਰਿਫਤਾਰ* ਗ੍ਰਿਫ਼ਤਾਰ* ਜੇਲ੍ਹ* ਜੇਲ* ਸਜ਼ਾ_ਹੋਈ ਜ਼ਮਾਨਤ*`,
    },
    gu: {
      words: `અને છે ના ની માં શું નથી ને`,
      self: `હું મારું મારી મારો મારા અમે અમારું અમારી`,
      HEALTH: `કેન્સર* ડાયાબિટીસ* ગર્ભવતી* ગર્ભપાત* દવા* દવાઓ હોસ્પિટલ* દવાખાન* અસ્થમા* હાર્ટ_એટેક લકવો* બીમારી* બીમાર*
        રોગ* એલર્જી* વિકલાંગ*`,
      MENTAL: `ડિપ્રેશન* હતાશા* પેનિક_એટેક માનસિક_બીમારી મનોવૈજ્ઞાનિક* મનોચિકિત્સક* થેરાપી* વ્યસન*`,
      SEXUALITY: `સમલૈંગિક* ગે લેસ્બિયન* ટ્રાન્સજેન્ડર*`,
      RELIGION: `મુસ્લિમ* ઇસ્લામ* ખ્રિસ્તી* હિન્દુ* જૈન* બૌદ્ધ* નાસ્તિક* મસ્જિદ*`,
      MONEY: `દેવું* કરજ* નાદાર*`,
      LEGAL: `ધરપકડ* જેલ* જામીન*`,
    },
    mr: {
      words: `आणि आहे च्या ची मध्ये काय नाही ला`,
      self: `मी माझा माझी माझे आम्ही आमचा आमची`,
      HEALTH: `कर्करोग* कॅन्सर* ट्यूमर* मधुमेह* डायबिटीस* गर्भवती* गरोदर* गर्भपात* औषध* रुग्णालय* हॉस्पिटल* दवाखान* अपस्मार*
        दमा* अर्धांगवायू* हृदयविकाराचा_झटका आजार* आजारी* ऍलर्जी* अॅलर्जी* अपंग*`,
      MENTAL: `नैराश्य* डिप्रेशन* पॅनिक_अटॅक मानसिक_आजार मानसशास्त्रज्ञ* मानसोपचार* थेरपी* व्यसन*`,
      SEXUALITY: `समलैंगिक* गे लेस्बियन* तृतीयपंथी* ट्रान्सजेंडर*`,
      RELIGION: `मुस्लिम* मुसलमान* इस्लाम* ख्रिश्चन* हिंदू* बौद्ध* जैन* नास्तिक* मशीद*`,
      MONEY: `कर्ज* दिवाळखोर*`,
      LEGAL: `तुरुंग* कारागृह* जामीन*`,
    },
    ta: {
      words: `மற்றும் ஒரு இது என்ன இல்லை அது`,
      self: `நான் என் என்னுடைய நாங்கள் நாம் எங்கள் நம்`,
      HEALTH: `புற்றுநோய்* நீரிழிவு* சர்க்கரை_நோய்* கர்ப்பம்* கர்ப்பிணி* கருக்கலைப்பு* மருந்து* மருத்துவமனை* வலிப்பு*
        ஆஸ்துமா* மாரடைப்பு* பக்கவாதம்* டிமென்ஷியா* அல்சைமர்* ஆட்டிசம்* நோய்* ஒவ்வாமை* மாற்றுத்திறனாளி*`,
      MENTAL: `மனச்சோர்வு* மன_அழுத்தம்* பதட்டம்* பீதி_தாக்குதல்* மனநோய்* மனநல* உளவியலாளர்* மனநல_மருத்துவர்* போதை*`,
      SEXUALITY: `ஓரினச்சேர்க்கை* தன்பால்* திருநங்கை* திருநம்பி* பாலியல்_நோக்குநிலை`,
      RELIGION: `முஸ்லிம்* இஸ்லாம்* கிறிஸ்தவ* கத்தோலிக்க* இந்து* பௌத்த* நாத்திக* மசூதி* ரமலான்* ரம்ஜான்*`,
      MONEY: `கடன்* திவால்*`,
      LEGAL: `கைது* சிறை* ஜாமீன்* குற்றப்பதிவு*`,
    },
    te: {
      words: `మరియు ఒక ఇది ఏమి కాదు లేదు`,
      self: `నేను నా మేము మా మనం మన`,
      HEALTH: `క్యాన్సర్* క్యాన్సరు* కణితి* మధుమేహం* షుగర్_వ్యాధి డయాబెటిస్* గర్భవతి* గర్భం* గర్భస్రావం* మందులు* ఆసుపత్రి*
        హాస్పిటల్* మూర్ఛ* ఆస్తమా* గుండెపోటు* పక్షవాతం* అల్జీమర్* ఆటిజం* వ్యాధి* జబ్బు* రోగం* అలర్జీ* వికలాంగ*`,
      MENTAL: `డిప్రెషన్* నిరాశ* పానిక్_అటాక్ మానసిక_వ్యాధి మానసిక_ఆరోగ్య* సైకాలజిస్ట్* సైకియాట్రిస్ట్* థెరపీ* వ్యసనం*`,
      SEXUALITY: `స్వలింగ* గే లెస్బియన్* ట్రాన్స్‌జెండర్* హిజ్రా*`,
      RELIGION: `ముస్లిం* ఇస్లాం* క్రైస్తవ* హిందూ* బౌద్ధ* నాస్తిక* మసీదు* రంజాన్*`,
      MONEY: `అప్పు* అప్పులు దివాలా*`,
      LEGAL: `అరెస్ట్* జైలు* బెయిల్* శిక్ష_పడ*`,
    },
    kn: {
      words: `ಮತ್ತು ಒಂದು ಇದು ಏನು ಇಲ್ಲ ಅದು`,
      self: `ನಾನು ನನ್ನ ನಾವು ನಮ್ಮ`,
      HEALTH: `ಕ್ಯಾನ್ಸರ್* ಗಡ್ಡೆ* ಮಧುಮೇಹ* ಸಕ್ಕರೆ_ಕಾಯಿಲೆ ಗರ್ಭಿಣಿ* ಗರ್ಭಪಾತ* ಔಷಧ* ಮಾತ್ರೆ* ಆಸ್ಪತ್ರೆ* ಮೂರ್ಛೆ* ಅಸ್ತಮಾ*
        ಹೃದಯಾಘಾತ* ಪಾರ್ಶ್ವವಾಯು* ಕಾಯಿಲೆ* ರೋಗ* ಅಲರ್ಜಿ* ಅಂಗವಿಕಲ*`,
      MENTAL: `ಖಿನ್ನತೆ* ಆತಂಕ* ಮಾನಸಿಕ_ಅಸ್ವಸ್ಥ* ಮನೋವೈದ್ಯ* ಮನಶ್ಶಾಸ್ತ್ರಜ್ಞ* ಥೆರಪಿ* ವ್ಯಸನ*`,
      SEXUALITY: `ಸಲಿಂಗ* ಗೇ ಲೆಸ್ಬಿಯನ್* ಮಂಗಳಮುಖಿ* ಟ್ರಾನ್ಸ್‌ಜೆಂಡರ್*`,
      RELIGION: `ಮುಸ್ಲಿಂ* ಇಸ್ಲಾಂ* ಕ್ರೈಸ್ತ* ಹಿಂದೂ* ಬೌದ್ಧ* ಜೈನ* ನಾಸ್ತಿಕ* ಮಸೀದಿ*`,
      MONEY: `ಸಾಲ* ದಿವಾಳಿ*`,
      LEGAL: `ಬಂಧನ* ಜೈಲು* ಸೆರೆಮನೆ* ಜಾಮೀನು*`,
    },
    ml: {
      words: `ഒരു ഇത് എന്ത് ഇല്ല ആണ് എന്ന്`,
      self: `ഞാൻ എന്റെ ഞങ്ങൾ ഞങ്ങളുടെ നമ്മൾ നമ്മുടെ`,
      HEALTH: `കാൻസർ* അർബുദ* ട്യൂമർ* പ്രമേഹ* ഗർഭിണി* ഗർഭച്ഛിദ്ര* മരുന്ന്* ആശുപത്രി* അപസ്മാര* ആസ്ത്മ* ഹൃദയാഘാത* പക്ഷാഘാത*
        രോഗ* അസുഖ* അലർജി* ഭിന്നശേഷി*`,
      MENTAL: `വിഷാദ* ഡിപ്രഷൻ* ഉത്കണ്ഠ* പാനിക്_അറ്റാക്ക് മാനസികാരോഗ്യ* മനോരോഗ* സൈക്കോളജിസ്റ്റ്* സൈക്യാട്രിസ്റ്റ്* തെറാപ്പി* ലഹരി*
        ആസക്തി*`,
      SEXUALITY: `സ്വവർഗ* ഗേ ലെസ്ബിയൻ* ട്രാൻസ്ജെൻഡർ*`,
      RELIGION: `മുസ്ലിം* ഇസ്ലാം* ക്രിസ്ത്യൻ* ക്രൈസ്തവ* ഹിന്ദു* നിരീശ്വര* പള്ളി*`,
      MONEY: `കടം* കടബാധ്യത* പാപ്പരാ*`,
      LEGAL: `അറസ്റ്റ്* ജയിൽ* ജാമ്യ*`,
    },
    si: {
      words: `සහ එක මේ මොකක්ද නැහැ ඒ`,
      self: `මම මගේ අපි අපේ`,
      HEALTH: `පිළිකා* දියවැඩියා* ගැබිනි* ගබ්සා* බෙහෙත්* ඖෂධ* රෝහල* රෝහලේ ආස්තමා* හෘදයාබාධ* අංශභාග* රෝග* අසනීප*
        අසාත්මිකතා* ආබාධිත*`,
      MENTAL: `විෂාදය* මානසික_අවපීඩන* කාංසාව* මානසික_රෝග* මනෝවිද්‍යාඥ* ඇබ්බැහි*`,
      SEXUALITY: `සමලිංගික* ලෙස්බියන්* සංක්‍රාන්ති_ලිංගික*`,
      RELIGION: `මුස්ලිම්* ඉස්ලාම්* ක්‍රිස්තියානි* කතෝලික* හින්දු* බෞද්ධ* නාස්තික* පල්ලිය*`,
      MONEY: `ණය* බංකොලොත්*`,
      LEGAL: `අත්අඩංගුවට* සිරගෙ* බන්ධනාගාර*`,
    },
    ne: {
      words: `र छ को मा यो के होइन लाई`,
      self: `म मेरो मेरी हामी हाम्रो`,
      HEALTH: `क्यान्सर* अर्बुद* ट्युमर* मधुमेह* गर्भवती* गर्भपतन* औषधि* औषधी* अस्पताल* छारेरोग* मुटुको_रोग पक्षघात* रोग*
        बिरामी* एलर्जी* अपाङ्ग*`,
      MENTAL: `डिप्रेसन* मानसिक_रोग मानसिक_स्वास्थ्य मनोविज्ञ* मनोचिकित्सक* थेरापी* लत कुलत*`,
      SEXUALITY: `समलिङ्गी* तेस्रो_लिङ्गी ट्रान्सजेन्डर*`,
      RELIGION: `मुस्लिम* मुसलमान* इस्लाम* इसाई* क्रिस्चियन* हिन्दु* बौद्ध* नास्तिक* मस्जिद*`,
      MONEY: `ऋण* कर्जा* टाट_पल्टि*`,
      LEGAL: `पक्राउ* जेल* कारागार* धरौटी*`,
    },

    // ---------- Oost- en Zuidoost-Azië ----------
    th: {
      words: `ที่ และ ไม่ เป็น ของ ได้ ครับ ค่ะ อะไร`,
      self: `ผม ฉัน ดิฉัน เรา`,
      HEALTH: `วินิจฉัย มะเร็ง เนื้องอก เคมีบำบัด เบาหวาน ตั้งครรภ์ แท้ง กินยา โรงพยาบาล เรื้อรัง ลมชัก หอบหืด หัวใจวาย
        หลอดเลือดสมอง อัมพาต สมองเสื่อม อัลไซเมอร์ พาร์กินสัน ออทิสติก ป่วย โรค ภูมิแพ้ ไมเกรน พิการ วัยทอง`,
      MENTAL: `ซึมเศร้า วิตกกังวล แพนิค หมดไฟ อะนอเร็กเซีย ไบโพลาร์ จิตเภท โรคจิต บาดแผลทางใจ นักจิตวิทยา จิตแพทย์
        นักบำบัด ยาต้านซึมเศร้า ติดยา ติดเหล้า เสพติด`,
      SEXUALITY: `เกย์ เลสเบี้ยน ไบเซ็กชวล คนข้ามเพศ ทรานส์ กะเทย นอนไบนารี เพศวิถี รสนิยมทางเพศ`,
      RELIGION: `มุสลิม อิสลาม คริสเตียน คาทอลิก ยิว ฮินดู ชาวพุทธ ไม่มีศาสนา อเทวนิยม ศาสนา มัสยิด รอมฎอน`,
      MONEY: `หนี้ ล้มละลาย ยึดทรัพย์ ไล่ที่`,
      LEGAL: `ประวัติอาชญากรรม ต้องโทษ ถูกจับ ติดคุก เข้าคุก เรือนจำ ประกันตัว ถูกฟ้อง`,
    },
    lo: {
      words: `ແລະ ທີ່ ບໍ່ ເປັນ ຂອງ ແມ່ນ`,
      self: `ຂ້ອຍ ຂ້າພະເຈົ້າ ພວກເຮົາ`,
      HEALTH: `ມະເຮັງ ເບົາຫວານ ຖືພາ ໂຮງໝໍ ເຈັບປ່ວຍ ພະຍາດ ກິນຢາ ຫອບຫືດ`,
      MENTAL: `ຊຶມເສົ້າ ກັງວົນ ນັກຈິດຕະວິທະຍາ ຈິດຕະແພດ ຕິດຢາ ຕິດເຫຼົ້າ`,
      SEXUALITY: `ຄົນຂ້າມເພດ ກະເທີຍ`,
      RELIGION: `ມຸດສະລິມ ອິສລາມ ຄຣິສຕຽນ ສາສະໜາ`,
      MONEY: `ໜີ້ ລົ້ມລະລາຍ`,
      LEGAL: `ຖືກຈັບ ເຂົ້າຄຸກ`,
    },
    km: {
      words: `និង ជា មិន នេះ របស់ ដែល`,
      self: `ខ្ញុំ យើង`,
      HEALTH: `មហារីក ទឹកនោមផ្អែម មានផ្ទៃពោះ រលូតកូន មន្ទីរពេទ្យ ជំងឺ ហឺត គាំងបេះដូង`,
      MENTAL: `ធ្លាក់ទឹកចិត្ត ការថប់បារម្ភ អ្នកចិត្តសាស្ត្រ ញៀនថ្នាំ ញៀនស្រា`,
      SEXUALITY: `ស្រឡាញ់ភេទដូចគ្នា អ្នកប្តូរភេទ`,
      RELIGION: `មូស្លីម អ៊ីស្លាម គ្រិស្តសាសនា សាសនា`,
      MONEY: `បំណុល ក្ស័យធន`,
      LEGAL: `ពន្ធនាគារ ចាប់ខ្លួន ជាប់គុក`,
    },
    my: {
      words: `ပါ တယ် သည် နဲ့ ဘာ`,
      self: `ကျွန်တော် ကျွန်မ ငါ ကျွန်ုပ်`,
      HEALTH: `ကင်ဆာ ဆီးချို ကိုယ်ဝန် ဆေးရုံ ရောဂါ နေမကောင်း ပန်းနာ နှလုံးရောဂါ`,
      MENTAL: `စိတ်ကျ စိုးရိမ်ပူပန် စိတ်ရောဂါ စိတ်ပညာရှင် စိတ်ကုဆရာဝန် မူးယစ်ဆေးစွဲ အရက်စွဲ`,
      SEXUALITY: `လိင်တူချစ်သူ ဂေး လိင်ပြောင်း`,
      RELIGION: `မွတ်စလင် အစ္စလာမ် ခရစ်ယာန် ဗုဒ္ဓဘာသာ ဘာသာတရား`,
      MONEY: `အကြွေး ဒေဝါလီ`,
      LEGAL: `အဖမ်းခံ ထောင်ကျ`,
    },
    zh: {
      words: `的 是 了 不 在 吗 嗎 什么 什麼 有`,
      self: `我 咱`,
      HEALTH: `确诊 確診 诊断 診斷 癌症 癌 肿瘤 腫瘤 化疗 化療 糖尿病 怀孕 懷孕 流产 流產 堕胎 墮胎 吃药 吃藥 药物 藥物 住院
        医院 醫院 慢性病 癫痫 癲癇 哮喘 心脏病 心臟病 中风 中風 痴呆 失智 阿尔茨海默 阿茲海默 帕金森 自闭症 自閉症 多动症
        過動症 生病 疾病 症状 症狀 过敏 過敏 偏头痛 偏頭痛 残疾 殘疾 更年期 病假`,
      MENTAL: `抑郁 抑鬱 憂鬱 焦虑 焦慮 惊恐发作 恐慌症 职业倦怠 进食障碍 飲食失調 厌食症 厭食症 暴食症 双相 雙相 躁郁 躁鬱
        精神分裂 精神病 创伤后 創傷後 心理咨询 心理諮商 心理医生 心理醫生 精神科 治疗师 治療師 抗抑郁药 抗憂鬱藥 成瘾 成癮
        上瘾 上癮 戒毒 戒酒`,
      SEXUALITY: `同性恋 同性戀 男同 女同 双性恋 雙性戀 跨性别 跨性別 变性 變性 非二元 酷儿 酷兒 性取向 性向 出柜 出櫃`,
      RELIGION: `穆斯林 伊斯兰 伊斯蘭 基督徒 基督教 天主教 犹太 猶太 佛教徒 无神论 無神論 信教 宗教信仰 清真寺 斋月 齋月`,
      MONEY: `欠债 欠債 负债 負債 债务 債務 催收 讨债 討債 破产 破產 网贷 網貸 失信被执行人`,
      LEGAL: `犯罪记录 犯罪記錄 案底 坐牢 判刑 被捕 被抓 监狱 監獄 拘留 缓刑 緩刑 假释 假釋`,
    },
    ja: {
      words: `の は が を です ます ない で に`,
      self: `私 わたし 僕 ぼく 俺 自分`,
      HEALTH: `診断 癌 腫瘍 抗がん剤 化学療法 糖尿病 妊娠 流産 中絶 服薬 入院 病院 慢性 てんかん 喘息 心筋梗塞 脳卒中 認知症
        アルツハイマー パーキンソン 自閉症 発達障害 病気 症状 アレルギー 片頭痛 障害者 更年期 休職`,
      MENTAL: `うつ病 鬱病 不安障害 パニック障害 パニック発作 燃え尽き 摂食障害 拒食症 過食症 双極性 統合失調症 精神病 トラウマ
        カウンセリング 心療内科 精神科 カウンセラー セラピスト 抗うつ薬 依存症 アルコール依存`,
      SEXUALITY: `同性愛 ゲイ レズビアン バイセクシュアル トランスジェンダー ノンバイナリー クィア 性的指向 カミングアウト`,
      RELIGION: `イスラム教 ムスリム キリスト教 クリスチャン カトリック ユダヤ 仏教徒 無神論 宗教 創価学会 モスク ラマダン`,
      MONEY: `借金 多重債務 債務整理 自己破産 破産 取り立て 差し押さえ 闇金 滞納`,
      LEGAL: `前科 逮捕 有罪判決 刑務所 服役 執行猶予 仮釈放 拘置所`,
    },
    ko: {
      words: `그리고 이 그 있어요 없어요 뭐 어떻게 하고 있는`,
      self: `나 나는 내가 나의 내 저는 제가 저의 제 우리 저희`,
      HEALTH: `진단* 암이 암을 암에 암으로 암환자* 종양* 항암* 당뇨* 임신* 낙태* 복용* 병원* 입원* 만성* 뇌전증* 간질*
        천식* 심장마비* 뇌졸중* 치매* 알츠하이머* 파킨슨* 자폐* 질병* 질환* 증상* 알레르기* 편두통* 장애인* 갱년기* 병가*`,
      MENTAL: `우울증* 우울* 불안장애* 공황장애* 공황* 번아웃* 섭식장애* 거식증* 폭식증* 조울증* 양극성* 조현병* 정신병*
        트라우마* 외상후* 심리상담* 상담사* 정신과* 정신건강* 치료사* 항우울제* 중독*`,
      SEXUALITY: `동성애* 게이* 레즈비언* 양성애* 트랜스젠더* 논바이너리* 퀴어* 성적_지향* 성정체성* 커밍아웃*`,
      RELIGION: `무슬림* 이슬람* 기독교* 크리스천* 천주교* 가톨릭* 유대교* 불교* 무신론* 종교* 신앙* 교회* 모스크* 라마단*`,
      MONEY: `빚* 채무* 채권자* 추심* 파산* 개인회생* 신용불량* 압류* 사채*`,
      LEGAL: `전과* 범죄기록* 체포* 구속* 징역* 교도소* 집행유예* 가석방* 수감*`,
    },
    vi: {
      words: `và là của không có những cho được này`,
      self: `tôi tớ mình em chúng_tôi chúng_ta`,
      HEALTH: `chẩn_đoán ung_thư khối_u hóa_trị tiểu_đường đái_tháo_đường mang_thai có_thai có_bầu sảy_thai phá_thai
        uống_thuốc bệnh_viện nhập_viện mãn_tính động_kinh hen_suyễn suyễn nhồi_máu_cơ_tim đột_quỵ sa_sút_trí_tuệ
        alzheimer* parkinson* tự_kỷ tăng_động bệnh triệu_chứng dị_ứng đau_nửa_đầu khuyết_tật mãn_kinh`,
      MENTAL: `trầm_cảm lo_âu rối_loạn_lo_âu hoảng_loạn kiệt_sức rối_loạn_ăn_uống lưỡng_cực tâm_thần_phân_liệt
        loạn_thần sang_chấn chuyên_gia_tâm_lý bác_sĩ_tâm_lý bác_sĩ_tâm_thần trị_liệu thuốc_chống_trầm_cảm nghiện
        cai_nghiện`,
      SEXUALITY: `đồng_tính gay les song_tính chuyển_giới phi_nhị_nguyên xu_hướng_tính_dục`,
      RELIGION: `hồi_giáo thiên_chúa_giáo công_giáo tin_lành do_thái phật_tử vô_thần theo_đạo tôn_giáo nhà_thờ ramadan`,
      MONEY: `nợ vỡ_nợ nợ_nần chủ_nợ đòi_nợ phá_sản tín_dụng_đen bị_đuổi_khỏi_nhà`,
      LEGAL: `tiền_án tiền_sự bị_bắt bị_kết_án ngồi_tù đi_tù nhà_tù trại_giam án_treo tại_ngoại`,
    },
    id: {
      words: `dan yang di ini itu tidak dengan untuk apa ada`,
      self: `aku saya kami kita gue gw`,
      HEALTH: `didiagnosis* kanker* tumor* kemoterapi* kemo diabetes kencing_manis hamil* keguguran* aborsi* obat*
        rumah_sakit dirawat* opname kronis* epilepsi* ayan asma serangan_jantung stroke demensia alzheimer* parkinson*
        autisme autis adhd penyakit* sakit* gejala* alergi* migrain* disabilitas* cacat* menopause`,
      MENTAL: `depresi* cemas* gangguan_kecemasan serangan_panik burnout gangguan_makan anoreksia bulimia bipolar*
        skizofrenia* psikosis ptsd trauma* psikolog* psikiater* terapis* terapi* antidepresan* kecanduan* pecandu*
        rehabilitasi*`,
      SEXUALITY: `gay lesbian* biseksual* transgender* waria* non-biner queer orientasi_seksual seksualitas*`,
      RELIGION: `muslim* islam* kristen* katolik* protestan* yahudi* hindu* buddha* buddhis* ateis* beragama* agama*
        masjid* gereja* ramadan* puasa*`,
      MONEY: `utang* hutang* pinjol* debt_collector penagih* bangkrut* pailit* diusir*`,
      LEGAL: `catatan_kriminal ditangkap* dipenjara* penjara* divonis* bebas_bersyarat tahanan*`,
    },
    ms: {
      words: `dan yang di ini itu tidak dengan untuk apa ada`,
      self: `saya aku kami kita`,
      HEALTH: `didiagnosis* kanser* tumor* kemoterapi* kencing_manis diabetes hamil* keguguran* pengguguran* ubat*
        hospital* kronik* epilepsi* sawan asma serangan_jantung strok demensia alzheimer* parkinson* autisme adhd
        penyakit* sakit* gejala* alergi* migrain* oku kurang_upaya menopaus*`,
      MENTAL: `kemurungan* depresi* keresahan* gangguan_kebimbangan serangan_panik burnout gangguan_makan anoreksia
        bulimia bipolar* skizofrenia* psikosis ptsd trauma* ahli_psikologi pakar_psikiatri psikiatri* kaunselor* terapi*
        antidepresan* ketagihan* penagih_dadah dadah*`,
      SEXUALITY: `gay lesbian* biseksual* transgender* mak_nyah pondan* queer orientasi_seksual`,
      RELIGION: `muslim* islam* kristian* katolik* yahudi* hindu* buddha* ateis* agama* masjid* gereja* ramadan* puasa*`,
      MONEY: `hutang* ah_long bankrap* muflis* pemiutang* diusir*`,
      LEGAL: `rekod_jenayah ditangkap* dipenjara* penjara*`,
    },
    tl: {
      words: `ang ng sa mga at na hindi ito ano`,
      self: `ako ko akin aking ako'y kami namin amin natin tayo`,
      HEALTH: `na-diagnose* nadiagnose* kanser* cancer tumor* chemo* diabetes buntis* nakunan aborsyon* gamot* ospital*
        hospital epilepsy* hika atake_sa_puso stroke dementia alzheimer* parkinson* autism* sakit* sintomas* allergy*
        alerdyi* migraine* kapansanan* menopause`,
      MENTAL: `depresyon* depression* anxiety* panic_attack* burnout bipolar* schizophrenia* psychologist* psychiatrist*
        therapist* therapy* adik* lulong*`,
      SEXUALITY: `bakla* tomboy* lesbiyana* bisexual* transgender* queer`,
      RELIGION: `muslim* islam* kristiyano* katoliko* iglesia_ni_cristo born_again ateista* relihiyon* simbahan* moske*`,
      MONEY: `utang* baon_sa_utang nalugi* pinalayas*`,
      LEGAL: `kulong* nakulong* bilangguan* hinuli* naaresto* arestado* kriminal_rekord`,
    },

    // ---------- Afrika ----------
    sw: {
      words: `na ni ya wa kwa za katika hii nini`,
      self: `mimi yangu wangu changu langu zangu sisi yetu wetu nina niko`,
      HEALTH: `saratani* uvimbe* kisukari* mjamzito* ujauzito* mimba* utoaji_mimba dawa* hospitali* kifafa* pumu*
        shambulio_la_moyo kiharusi* ugonjwa* magonjwa* mgonjwa* mzio* ulemavu* mlemavu*`,
      MENTAL: `msongo_wa_mawazo sonona* wasiwasi* matatizo_ya_akili ugonjwa_wa_akili mwanasaikolojia* daktari_wa_akili
        uraibu* mlevi* dawa_za_kulevya`,
      SEXUALITY: `shoga* msagaji* jinsia_mbili mbadili_jinsia* waliobadili_jinsia`,
      RELIGION: `muislamu* waislamu* uislamu* mkristo* wakristo* ukristo* mkatoliki* myahudi* mhindu* mbudha* sina_dini
        dini* msikiti* kanisa* ramadhani* mfungo*`,
      MONEY: `deni* madeni* kufilisika* mdai*`,
      LEGAL: `rekodi_ya_uhalifu nilikamatwa* kukamatwa* gerezani* gereza* jela* kifungo* dhamana*`,
    },
    am: {
      words: `እና ነው ውስጥ ይህ ምን አይደለም`,
      self: `እኔ የኔ የእኔ እኛ የኛ የእኛ`,
      HEALTH: `ካንሰር* እርጉዝ* ነፍሰ_ጡር ውርጃ* መድሃኒት* መድኃኒት* ሆስፒታል* የሚጥል_በሽታ አስም* የልብ_ድካም ስትሮክ* በሽታ* ታማሚ*
        ታምሜ አለርጂ* አካል_ጉዳተኛ*`,
      MENTAL: `ድብርት* ጭንቀት* የአእምሮ_ጤና የአእምሮ_ህመም ሳይኮሎጂስት* የሥነ_ልቦና ቴራፒ* ሱስ*`,
      SEXUALITY: `ግብረ_ሰዶማዊ* ሌዝቢያን* ትራንስጀንደር*`,
      RELIGION: `ሙስሊም* እስልምና* ክርስቲያን* ኦርቶዶክስ* ካቶሊክ* ፕሮቴስታንት* አይሁድ* ሃይማኖት* መስጊድ* ቤተ_ክርስቲያን ረመዳን* ጾም*`,
      MONEY: `ዕዳ* እዳ*`,
      LEGAL: `ታሰርኩ ታስሬ እስር_ቤት ተፈርዶብኝ*`,
    },
    ha: {
      words: `da ne ce a ba wannan me shi ita`,
      self: `ni ina nawa mu mun`,
      HEALTH: `ciwon_daji ciwon_suga zubar_da_ciki magani* asibiti* farfadiya ciwon_zuciya bugun_jini ciwo* rashin_lafiya
        nakasa*`,
      MENTAL: `damuwa* bakin_ciki tabin_hankali likitan_kwakwalwa shaye-shaye`,
      SEXUALITY: `dan_luwadi 'yan_luwadi ’yan_luwadi 'yar_madigo ’yar_madigo luwadi* madigo*`,
      RELIGION: `musulmi* musulunci* kirista* bayahude* addini* masallaci* coci* azumi*`,
      MONEY: `bashi*`,
      LEGAL: `kurkuku* gidan_yari an_yanke_min_hukunci`,
    },
    yo: {
      words: `ati ni ti kò sí ohun kini kí`,
      self: `èmi emi mo mi àwa awa wa`,
      HEALTH: `jẹjẹrẹ jejere àtọ̀gbẹ atogbe oyún oyun ìṣẹ́yún iseyun oògùn oogun ilé_ìwòsàn ile_iwosan wárápá warapa àìsàn
        aisan àrùn arun`,
      MENTAL: `ìrẹ̀wẹ̀sì irewesi àníyàn aniyan àìsàn_ọpọlọ aisan_opolo`,
      SEXUALITY: `gay lesbian* transgender*`,
      RELIGION: `mùsùlùmí musulumi ìmàle imale kìrìsìtẹ́ni kirisiteni onigbagbọ onigbagbo ẹ̀sìn esin mọ́sálásí mosalasi
        ṣọ́ọ̀ṣì soosi àwẹ̀`,
      MONEY: `gbèsè gbese`,
      LEGAL: `ẹ̀wọ̀n ewon ọgbà_ẹ̀wọ̀n ogba_ewon wọ́n_mú_mi won_mu_mi`,
    },
    ig: {
      words: `na bụ nke ọ ga adịghị gịnị`,
      self: `m mụ mu anyị anyi`,
      HEALTH: `cancer ọrịa oria ọrịa_shuga oria_shuga ọgwụ ogwu ụlọ_ọgwụ ulo_ogwu`,
      MENTAL: `ịda_mbà ida_mba nchekasị nchekasi ọrịa_uche oria_uche`,
      SEXUALITY: `gay lesbian* transgender*`,
      RELIGION: `onye_alakụba onye_alakuba alakụba alakuba onye_kraịst onye_kraist ụka uka okpukpe`,
      MONEY: `onye_ji_ụgwọ`,
      LEGAL: `ụlọ_mkpọrọ ulo_mkporo ejidere_m`,
    },
    zu: {
      words: `futhi kanti yini ukuthi lokhu akukho uma`,
      self: `mina wami yami lami sami bami zami kwami thina wethu yethu`,
      HEALTH: `umdlavuza* isifo_sikashukela ukhulelwe* ngikhulelwe ukukhipha_isisu isibhedlela* esibhedlela* isithuthwane
        isifuba_somoya isifo* ngiyagula ukugula* ukukhubazeka*`,
      MENTAL: `ukudangala* ukukhathazeka* ingcindezi* impilo_yengqondo isifo_sengqondo`,
      SEXUALITY: `isitabane* izitabane ongqingili* umlesbiyani`,
      RELIGION: `umsulumane* amasulumane* islamu umkristu* amakristu* inkolo*`,
      MONEY: `isikweletu* izikweletu*`,
      LEGAL: `ejele* ijele* ngaboshwa* waboshwa* ukuboshwa*`,
    },
    xh: {
      words: `kwaye ukuba yintoni le akukho xa`,
      self: `mna wam yam lam sam bam zam kwam thina wethu yethu`,
      HEALTH: `umhlaza* isifo_seswekile ukhulelwe* ukuqhomfa* amayeza* iyeza* isibhedlele* esibhedlele* isifo* izifo*
        ndiyagula ukugula*`,
      MENTAL: `uxinzelelo* ukudakumba* ixhala* impilo_yengqondo`,
      SEXUALITY: `isitabane* izitabane`,
      RELIGION: `umsilamsi* amasilamsi* umkristu* amakristu* unqulo* inkolo* icawa*`,
      MONEY: `ityala* amatyala*`,
      LEGAL: `entolongweni* intolongo* ndabanjwa`,
    },
    so: {
      words: `iyo waa oo ka ku ma maxay`,
      self: `aniga anigu waxaan kayga tayda annaga anagu`,
      HEALTH: `kansar* sonkorow* uurka uurqaad daawo* isbitaal* wadne_xanuun jirro* cudur* xanuun* xasaasiyad* naafo*`,
      MENTAL: `niyad-jab* niyadjab* walwal* welwel* maskax_xanuun dhakhtarka_maskaxda caafimaadka_dhimirka`,
      SEXUALITY: `khaniis*`,
      RELIGION: `muslim* islaam* masiixi* kiristaan* yuhuudi* diin* masaajid* masjid* ramadaan*`,
      MONEY: `deyn*`,
      LEGAL: `xabsi* la_i_xiray`,
    },
  };

  const api = { LANGS, DENSE, LOOSE };
  root.PrivacyTopicWords = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
