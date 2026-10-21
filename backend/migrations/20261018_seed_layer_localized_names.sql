-- Populate English/French layer and group names from the production snapshot
-- captured on 2026-10-18. This script updates localization columns only.
-- It does not rename legacy names or GeoServer layers, change relationships,
-- delete rows, or touch raster/statistics data.
BEGIN;

SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE expected_group_translations (
  id integer PRIMARY KEY,
  expected_name text NOT NULL,
  name_en text NOT NULL,
  name_fr text NOT NULL
) ON COMMIT DROP;

INSERT INTO expected_group_translations (id, expected_name, name_en, name_fr) VALUES
  (1,  'SO-1 : Ecosystems',             'SO-1: Ecosystems',              'OS-1 : Écosystèmes'),
  (2,  'SO-2 : Populations',            'SO-2: Populations',             'OS-2 : Populations'),
  (3,  'SO-3 : Drought mitigating',     'SO-3: Drought Mitigation',      'OS-3 : Atténuation de la sécheresse'),
  (4,  'SO-4 : Environmental Benefits', 'SO-4: Environmental Benefits',  'OS-4 : Avantages environnementaux'),
  (5,  'SO1-1',                         'SO1-1',                          'OS1-1'),
  (6,  'SO1-2',                         'SO1-2',                          'OS1-2'),
  (7,  'SO1-3',                         'SO1-3',                          'OS1-3'),
  (8,  'SO1-4',                         'SO1-4',                          'OS1-4'),
  (9,  'SO2-1',                         'SO2-1',                          'OS2-1'),
  (10, 'SO2-2',                         'SO2-2',                          'OS2-2'),
  (11, 'SO2-3',                         'SO2-3',                          'OS2-3'),
  (12, 'SO3-1',                         'SO3-1',                          'OS3-1'),
  (13, 'SO3-2',                         'SO3-2',                          'OS3-2'),
  (14, 'SO3-3',                         'SO3-3',                          'OS3-3'),
  (15, 'SO4-1',                         'SO4-1',                          'OS4-1'),
  (16, 'SO4-2',                         'SO4-2',                          'OS4-2'),
  (17, 'SO4-3',                         'SO4-3',                          'OS4-3'),
  (18, 'Land Cover',                    'Land Cover',                     'Occupation du sol'),
  (19, 'Land Cover Change',             'Land Cover Change',              'Changement d’occupation du sol'),
  (20, 'OSS',                           'OSS',                            'OSS'),
  (21, 'ESA',                           'ESA',                            'ESA'),
  (22, 'Land Productivity',             'Land Productivity',              'Productivité des terres'),
  (23, 'Soil Organic Carbon (SOC)',     'Soil Organic Carbon (SOC)',      'Carbone organique du sol (COS)'),
  (24, 'SDG 15.3.1',                    'SDG 15.3.1',                     'ODD 15.3.1');

CREATE TEMP TABLE expected_layer_translations (
  id integer PRIMARY KEY,
  expected_geoserver_name text NOT NULL,
  display_name_en text NOT NULL,
  display_name_fr text NOT NULL
) ON COMMIT DROP;

INSERT INTO expected_layer_translations (id, expected_geoserver_name, display_name_en, display_name_fr) VALUES
  (4,  'LC:LandcoverOSS2000',                               'Land Cover 2000',                                      'Occupation du sol 2000'),
  (5,  'LC:LandcoverOSS2015',                               'Land Cover 2015',                                      'Occupation du sol 2015'),
  (6,  'LC:LandCoverOSS2023V2COG',                          'Land Cover 2023',                                      'Occupation du sol 2023'),
  (10, 'SO3:band_01_SPI_min_2000-2003_COG',                 'Minimum SPI 2000–2003',                                'SPI minimum 2000–2003'),
  (11, 'SO3:band_03_SPI_min_2004-2007_COG',                 'Minimum SPI 2004–2007',                                'SPI minimum 2004–2007'),
  (12, 'SO3:band_05_SPI_min_2008-2011_COG',                 'Minimum SPI 2008–2011',                                'SPI minimum 2008–2011'),
  (13, 'SO3:band_07_SPI_min_2012-2015_COG',                 'Minimum SPI 2012–2015',                                'SPI minimum 2012–2015'),
  (14, 'SO3:band_09_SPI_min_2016-2019_COG',                 'Minimum SPI 2016–2019',                                'SPI minimum 2016–2019'),
  (15, 'SO3:band_11_SPI_min_2020-2023_COG',                 'Minimum SPI 2020–2023',                                'SPI minimum 2020–2023'),
  (21, 'SoilOrganicCarbon:SOC_baseline_COG',                'Soil Organic Carbon (SOC) — Baseline',                 'Carbone organique du sol (COS) — référence'),
  (22, 'SoilOrganicCarbon:SOC_reporting_COG',               'Soil Organic Carbon (SOC) — Reporting',                'Carbone organique du sol (COS) — rapport'),
  (23, 'LCC:LC_Change_OSS_Baseline_COG',                    'OSS Land Cover Change — Baseline',                     'Changement d’occupation du sol OSS — référence'),
  (24, 'LCC:LC_change_OSS_Reporting_COG',                   'OSS Land Cover Change — Reporting',                    'Changement d’occupation du sol OSS — rapport'),
  (25, 'LC-ESA:LandCoverESACCI_2000_COG',                   'ESA Land Cover 2000',                                  'Occupation du sol ESA 2000'),
  (26, 'LC-ESA:LandCoverESACCI_2010_COG',                   'ESA Land Cover 2010',                                  'Occupation du sol ESA 2010'),
  (27, 'LC-ESA:LandCoverESACCI_2015_COG',                   'ESA Land Cover 2015',                                  'Occupation du sol ESA 2015'),
  (30, 'SDG:sdg_15_3_1_baseline_COG',                       'SDG 15.3.1 — Baseline',                                'ODD 15.3.1 — référence'),
  (31, 'SDG:sdg_15_3_1_reporting_COG',                      'SDG 15.3.1 — Reporting',                               'ODD 15.3.1 — rapport'),
  (32, 'SO2:africa',                                        'Latest Water Access',                                  'Dernier niveau d’accès à l’eau'),
  (33, 'SO2:access water change',                           '20-Year Water Access Change (2000–2020)',              'Évolution de l’accès à l’eau sur 20 ans (2000–2020)'),
  (34, 'SO2:Urban-Rural Gap',                               'Urban–Rural Gap',                                      'Écart urbain–rural'),
  (35, 'SO2:Latest Gini Index',                             'Latest Gini Index',                                    'Dernier indice de Gini'),
  (36, 'SO2:Gini Trend: Improved vs Worsened',              'Gini Trend: Improved vs Worsened',                     'Tendance de Gini : amélioration ou détérioration'),
  (43, 'SO3:band_02_POP_total_2000-2003',                   'Population Exposed to Drought 2000–2003',              'Population exposée à la sécheresse 2000–2003'),
  (44, 'SO3:band_04_POP_total_2004-2007',                   'Population Exposed to Drought 2004–2007',              'Population exposée à la sécheresse 2004–2007'),
  (45, 'SO3:band_06_POP_total_2008-2011',                   'Population Exposed to Drought 2008–2011',              'Population exposée à la sécheresse 2008–2011'),
  (46, 'SO3:band_08_POP_total_2012-2015',                   'Population Exposed to Drought 2012–2015',              'Population exposée à la sécheresse 2012–2015'),
  (47, 'SO3:band_10_POP_total_2016-2019',                   'Population Exposed to Drought 2016–2019',              'Population exposée à la sécheresse 2016–2019'),
  (48, 'SO3:band_12_POP_total_2020-2023',                   'Population Exposed to Drought 2020–2023',              'Population exposée à la sécheresse 2020–2023'),
  (49, 'SO3:band_13_POP_female_2020-2023',                  'Female Population Exposed to Drought 2020–2023',       'Population féminine exposée à la sécheresse 2020–2023'),
  (50, 'SO3:band_14_POP_male_2020-2023',                    'Male Population Exposed to Drought 2020–2023',         'Population masculine exposée à la sécheresse 2020–2023'),
  (51, 'LP:LPD JRC 250m',                                   'Land Productivity Dynamics — JRC 250 m',              'Dynamique de la productivité des terres — JRC 250 m'),
  (52, 'LP:LPD Trends Earth 250m',                          'Land Productivity Dynamics — Trends.Earth 250 m',     'Dynamique de la productivité des terres — Trends.Earth 250 m'),
  (53, 'LP:LPD-FAO-WOCAT-250m',                             'Land Productivity Dynamics — FAO-WOCAT 250 m',        'Dynamique de la productivité des terres — FAO-WOCAT 250 m'),
  (61, 'LP:LandProductivity_5classes_baseline_Africa_COG',  'OSS Land Productivity — Baseline',                    'Productivité des terres OSS — référence'),
  (62, 'LP:LandProductivity_5classes_reporting_Africa_COG', 'OSS Land Productivity — Reporting',                   'Productivité des terres OSS — rapport'),
  (56, 'SO4:Agelastes meleagrides',                         'Agelastes meleagrides',                                'Agelastes meleagrides'),
  (57, 'SO4:BirdsCircaetus gallicus',                       'Circaetus gallicus',                                   'Circaetus gallicus'),
  (58, 'SO4:Buteo buteo',                                   'Buteo buteo',                                          'Buteo buteo'),
  (59, 'SO4:Caprimulgus aegyptius',                         'Caprimulgus aegyptius',                                'Caprimulgus aegyptius'),
  (60, 'SO4:Circus macrourus',                              'Circus macrourus',                                     'Circus macrourus');

-- Abort before updating anything if IDs/names have drifted since the snapshot.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM expected_group_translations e
    LEFT JOIN layer_groups g ON g.id = e.id AND g.name = e.expected_name
    WHERE g.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Group preflight failed: an expected ID/name pair is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM expected_layer_translations e
    LEFT JOIN layers l ON l.id = e.id AND l.geoserver_name = e.expected_geoserver_name
    WHERE l.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Layer preflight failed: an expected ID/GeoServer pair is missing';
  END IF;
END $$;

UPDATE layer_groups g
SET name_en = e.name_en,
    name_fr = e.name_fr,
    updated_at = CURRENT_TIMESTAMP
FROM expected_group_translations e
WHERE g.id = e.id
  AND g.name = e.expected_name;

UPDATE layers l
SET display_name_en = e.display_name_en,
    display_name_fr = e.display_name_fr,
    updated_at = CURRENT_TIMESTAMP
FROM expected_layer_translations e
WHERE l.id = e.id
  AND l.geoserver_name = e.expected_geoserver_name;

-- Transaction-local verification. Any missing translation aborts everything.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM expected_group_translations e
    JOIN layer_groups g ON g.id = e.id
    WHERE g.name_en IS DISTINCT FROM e.name_en
       OR g.name_fr IS DISTINCT FROM e.name_fr
  ) THEN
    RAISE EXCEPTION 'Verification failed: at least one group translation differs';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM expected_layer_translations e
    JOIN layers l ON l.id = e.id
    WHERE l.display_name_en IS DISTINCT FROM e.display_name_en
       OR l.display_name_fr IS DISTINCT FROM e.display_name_fr
  ) THEN
    RAISE EXCEPTION 'Verification failed: at least one layer translation differs';
  END IF;
END $$;

COMMIT;

-- Read-only summary after commit.
SELECT
  (SELECT count(*) FROM layer_groups WHERE name_en IS NOT NULL AND name_fr IS NOT NULL) AS translated_groups,
  (SELECT count(*) FROM layers WHERE display_name_en IS NOT NULL AND display_name_fr IS NOT NULL) AS translated_layers;
