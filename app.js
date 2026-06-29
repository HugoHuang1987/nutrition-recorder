const STORAGE_KEYS = {
  profile: "nutrition-recorder.profile.v1",
  foods: "nutrition-recorder.foods.v1",
  hiddenQuickFoods: "nutrition-recorder.hidden-quick-foods.v1",
  records: "nutrition-recorder.records.v1",
  aiSettings: "nutrition-recorder.ai-settings.v1",
  aiInterpretCache: "nutrition-recorder.ai-interpret-cache.v1",
};

const MEALS = ["早餐", "午餐", "晚餐", "加餐"];
const NUTRIENT_KEYS = [
  "kcal",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "calcium",
  "potassium",
  "sodium",
  "magnesium",
  "iron",
  "vitaminC",
  "vitaminD",
  "cholesterol",
];

const NUTRIENT_LABELS = {
  kcal: ["总热量", "kcal", 0],
  protein: ["蛋白质", "g", 1],
  carbs: ["碳水", "g", 1],
  fat: ["脂肪", "g", 1],
  fiber: ["膳食纤维", "g", 1],
  calcium: ["钙", "mg", 0],
  potassium: ["钾", "mg", 0],
  sodium: ["钠", "mg", 0],
  magnesium: ["镁", "mg", 0],
  iron: ["铁", "mg", 1],
  vitaminC: ["维生素C", "mg", 1],
  vitaminD: ["维生素D", "μg", 1],
  cholesterol: ["胆固醇", "mg", 0],
};

const DEFAULT_PROFILE = {
  age: 39,
  sex: "male",
  weight: 90,
  targetWeight: 82,
  processType: "muscle_loss",
};

const DEFAULT_AI_SETTINGS = {
  apiKey: "",
  model: "gpt-5.5",
  baseUrl: "https://live-turing.cn.llm.tcljd.com/api/v1",
  apiType: "chat",
  useWebSearch: false,
};

const TURING_AI_PRESET = {
  baseUrl: "https://live-turing.cn.llm.tcljd.com/api/v1",
  apiType: "chat",
  model: "gpt-5.5",
  useWebSearch: false,
};

const GENERIC_FOOD_ALIAS_TERMS = new Set(["牛奶"]);
const PACKAGED_NUTRIENT_RULES = [
  { key: "kcal", label: "热量", names: ["热量", "能量", "kcal", "千卡"], unitPattern: "(?:kcal|千卡)" },
  { key: "protein", label: "蛋白", names: ["蛋白质", "蛋白"], unitPattern: "(?:g|克)" },
  { key: "carbs", label: "碳水", names: ["碳水化合物", "碳水"], unitPattern: "(?:g|克)" },
  { key: "fat", label: "脂肪", names: ["脂肪"], unitPattern: "(?:g|克)" },
  { key: "fiber", label: "纤维", names: ["膳食纤维", "纤维"], unitPattern: "(?:g|克)" },
  { key: "sodium", label: "钠", names: ["钠"], unitPattern: "(?:mg|毫克)" },
];
const WATER_STATUS_OPTIONS = {
  normal: {
    label: "正常",
    range: [0, 0],
    note: "未记录额外水分因素，不额外增加总体重上限",
  },
  retention: {
    label: "偏水肿/回补",
    range: [0.1, 0.6],
    note: "明确记录水肿、高碳回补、训练酸痛或睡眠压力等因素时使用",
  },
  depleted: {
    label: "偏脱水/排空",
    range: [-0.4, 0],
    note: "明确记录大量出汗、脱水、腹泻或排空较多时使用",
  },
};
const CUMULATIVE_GLYCOGEN_WATER_MIN_KG = -0.8;
const CUMULATIVE_GLYCOGEN_WATER_MAX_KG = 0.3;

const PROCESS_TYPES = {
  muscle_loss: {
    label: "保持肌肉减重",
    deficitMin: 0.15,
    deficitMax: 0.22,
    proteinMin: 1.8,
    proteinMax: 2.2,
    fatMin: 0.55,
    fatMax: 0.75,
    carbFloor: 100,
    minBmrFactor: 0.95,
    note: "优先保肌，久坐缺口温和，蛋白质更高。",
  },
  steady_loss: {
    label: "稳步减重",
    deficitMin: 0.2,
    deficitMax: 0.28,
    proteinMin: 1.6,
    proteinMax: 2,
    fatMin: 0.5,
    fatMax: 0.7,
    carbFloor: 80,
    minBmrFactor: 0.9,
    note: "速度和可持续性折中，适合多数减脂日。",
  },
  fast_loss: {
    label: "快速减重",
    deficitMin: 0.27,
    deficitMax: 0.35,
    proteinMin: 2,
    proteinMax: 2.4,
    fatMin: 0.45,
    fatMax: 0.65,
    carbFloor: 60,
    minBmrFactor: 0.85,
    note: "缺口更大，建议短周期使用，并观察训练和恢复。",
  },
  maintain: {
    label: "维持体重",
    deficitMin: -0.05,
    deficitMax: 0.05,
    proteinMin: 1.4,
    proteinMax: 1.8,
    fatMin: 0.6,
    fatMax: 0.9,
    carbFloor: 130,
    minBmrFactor: 1,
    note: "以维持状态和稳定训练表现为主。",
  },
};

const SAMPLE_TEXT = `早餐:
1 水果黄瓜，1根
2 全脂牛奶1盒，200ml，4g/100ml蛋白质
3 鸡蛋一个
4 油桃一个，70克
5 山竹，1个
6 红薯，100克
7 鸡蛋白，1个

午餐:
1 水煮鲈鱼罐头，150克
2 鸡蛋一个
3 蓝莓，125克
4 鸡蛋白，1个
5 水果黄瓜一根

晚餐:
1 酱牛腱，53克
2 鸡蛋白2个
3 水果黄瓜一根
4 蛋白粉，40克
5 混合坚果，25克
6 小番茄250克`;

function completeNutrients(nutrients) {
  return NUTRIENT_KEYS.reduce((result, key) => {
    result[key] = numericValue(nutrients[key]);
    return result;
  }, {});
}

function makeFood(id, name, category, qty, unit, nutrients, aliases = []) {
  return {
    id,
    name,
    category,
    qty,
    unit,
    nutrients: completeNutrients(nutrients),
    aliases,
    custom: false,
    createdAt: null,
    needsNutrition: false,
    dataSource: "内置估算",
    sourceNote: "",
    confidence: "medium",
    usage: 0,
  };
}

const DEFAULT_FOODS = [
  makeFood("fruit-cucumber", "水果黄瓜", "蔬果", 1, "根", {
    kcal: 15,
    protein: 0.7,
    carbs: 3.6,
    fat: 0.1,
    fiber: 0.6,
    calcium: 16,
    potassium: 150,
    sodium: 2,
    magnesium: 12,
    iron: 0.3,
    vitaminC: 4,
  }, ["黄瓜", "小黄瓜"]),
  makeFood("whole-milk", "全脂牛奶", "乳制品", 100, "ml", {
    kcal: 62,
    protein: 4,
    carbs: 4.8,
    fat: 3.3,
    calcium: 120,
    potassium: 150,
    sodium: 45,
    magnesium: 11,
    vitaminC: 1,
    vitaminD: 0.05,
    cholesterol: 10,
  }, ["牛奶"]),
  makeFood("egg", "鸡蛋", "蛋类", 1, "个", {
    kcal: 72,
    protein: 6.3,
    carbs: 0.4,
    fat: 4.8,
    calcium: 28,
    potassium: 69,
    sodium: 70,
    magnesium: 6,
    iron: 0.9,
    vitaminD: 1.1,
    cholesterol: 186,
  }, ["全蛋"]),
  makeFood("nectarine", "油桃", "水果", 100, "g", {
    kcal: 44,
    protein: 1,
    carbs: 10.7,
    fat: 0.3,
    fiber: 1.7,
    calcium: 6,
    potassium: 201,
    magnesium: 9,
    iron: 0.3,
    vitaminC: 5.4,
  }),
  makeFood("mangosteen", "山竹", "水果", 1, "个", {
    kcal: 18,
    protein: 0.1,
    carbs: 4.5,
    fat: 0.1,
    fiber: 0.5,
    calcium: 3,
    potassium: 20,
    magnesium: 3,
    vitaminC: 1,
  }),
  makeFood("sweet-potato", "红薯", "主食", 100, "g", {
    kcal: 90,
    protein: 2,
    carbs: 20.7,
    fat: 0.2,
    fiber: 3,
    calcium: 30,
    potassium: 337,
    sodium: 55,
    magnesium: 25,
    iron: 0.6,
    vitaminC: 20,
  }, ["地瓜"]),
  makeFood("egg-white", "鸡蛋白", "蛋类", 1, "个", {
    kcal: 17,
    protein: 3.6,
    carbs: 0.2,
    fat: 0.1,
    calcium: 2,
    potassium: 54,
    sodium: 55,
    magnesium: 4,
  }, ["蛋白", "蛋清"]),
  makeFood("bass-can", "水煮鲈鱼罐头", "肉鱼", 100, "g", {
    kcal: 166.7,
    protein: 23,
    fat: 10,
    calcium: 25,
    potassium: 350,
    sodium: 500,
    magnesium: 35,
    iron: 0.5,
    vitaminD: 2,
    cholesterol: 70,
  }, ["鲈鱼罐头", "水煮鲈鱼"]),
  makeFood("blueberry", "蓝莓", "水果", 100, "g", {
    kcal: 57,
    protein: 0.7,
    carbs: 14.5,
    fat: 0.3,
    fiber: 2.4,
    calcium: 6,
    potassium: 77,
    sodium: 1,
    magnesium: 6,
    iron: 0.3,
    vitaminC: 9.7,
  }),
  makeFood("braised-beef-shank", "酱牛腱", "肉鱼", 100, "g", {
    kcal: 154.7,
    protein: 30,
    carbs: 2.1,
    fat: 3,
    calcium: 12,
    potassium: 320,
    sodium: 800,
    magnesium: 22,
    iron: 3,
    cholesterol: 70,
  }, ["牛腱", "卤牛腱"]),
  makeFood("protein-powder", "蛋白粉", "补剂", 40, "g", {
    kcal: 160,
    protein: 32,
    carbs: 4,
    fat: 2,
    calcium: 120,
    potassium: 180,
    sodium: 120,
    magnesium: 30,
    iron: 1,
    cholesterol: 20,
  }),
  makeFood("mixed-nuts", "混合坚果", "坚果", 25, "g", {
    kcal: 150,
    protein: 5,
    carbs: 5,
    fat: 13,
    fiber: 2.5,
    calcium: 35,
    potassium: 160,
    sodium: 2,
    magnesium: 75,
    iron: 1.3,
  }, ["坚果"]),
  makeFood("cherry-tomato", "小番茄", "蔬果", 100, "g", {
    kcal: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    fiber: 1.2,
    calcium: 10,
    potassium: 237,
    sodium: 5,
    magnesium: 11,
    iron: 0.3,
    vitaminC: 14,
  }, ["圣女果"]),
  makeFood("chicken-breast", "鸡胸肉", "肉鱼", 100, "g", {
    kcal: 165,
    protein: 31,
    fat: 3.6,
    calcium: 15,
    potassium: 256,
    sodium: 74,
    magnesium: 29,
    iron: 1,
    cholesterol: 85,
  }),
  makeFood("cooked-rice", "米饭", "主食", 100, "g", {
    kcal: 116,
    protein: 2.6,
    carbs: 25.9,
    fat: 0.3,
    fiber: 0.3,
    potassium: 25,
    sodium: 1,
    magnesium: 7,
    iron: 0.2,
  }, ["熟米饭"]),
  makeFood("oats", "燕麦", "主食", 100, "g", {
    kcal: 389,
    protein: 16.9,
    carbs: 66.3,
    fat: 6.9,
    fiber: 10.6,
    calcium: 54,
    potassium: 429,
    sodium: 2,
    magnesium: 177,
    iron: 4.7,
  }),
  makeFood("banana", "香蕉", "水果", 100, "g", {
    kcal: 89,
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
    fiber: 2.6,
    calcium: 5,
    potassium: 358,
    sodium: 1,
    magnesium: 27,
    iron: 0.3,
    vitaminC: 8.7,
  }),
  makeFood("apple", "苹果", "水果", 100, "g", {
    kcal: 52,
    protein: 0.3,
    carbs: 13.8,
    fat: 0.2,
    fiber: 2.4,
    calcium: 6,
    potassium: 107,
    sodium: 1,
    magnesium: 5,
    iron: 0.1,
    vitaminC: 4.6,
  }),
  makeFood("broccoli", "西兰花", "蔬果", 100, "g", {
    kcal: 34,
    protein: 2.8,
    carbs: 6.6,
    fat: 0.4,
    fiber: 2.6,
    calcium: 47,
    potassium: 316,
    sodium: 33,
    magnesium: 21,
    iron: 0.7,
    vitaminC: 89,
  }),
  makeFood("spinach", "菠菜", "蔬果", 100, "g", {
    kcal: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    fiber: 2.2,
    calcium: 99,
    potassium: 558,
    sodium: 79,
    magnesium: 79,
    iron: 2.7,
    vitaminC: 28,
  }),
  makeFood("lettuce", "生菜", "蔬果", 100, "g", {
    kcal: 15,
    protein: 1.4,
    carbs: 2.9,
    fat: 0.2,
    fiber: 1.3,
    calcium: 36,
    potassium: 194,
    sodium: 28,
    magnesium: 13,
    iron: 0.9,
    vitaminC: 9,
  }),
  makeFood("carrot", "胡萝卜", "蔬果", 100, "g", {
    kcal: 41,
    protein: 0.9,
    carbs: 9.6,
    fat: 0.2,
    fiber: 2.8,
    calcium: 33,
    potassium: 320,
    sodium: 69,
    magnesium: 12,
    iron: 0.3,
    vitaminC: 5.9,
  }),
  makeFood("corn", "玉米", "主食", 100, "g", {
    kcal: 96,
    protein: 3.4,
    carbs: 21,
    fat: 1.5,
    fiber: 2.4,
    calcium: 3,
    potassium: 218,
    sodium: 1,
    magnesium: 26,
    iron: 0.5,
    vitaminC: 5.5,
  }),
  makeFood("tofu", "北豆腐", "豆制品", 100, "g", {
    kcal: 116,
    protein: 9.2,
    carbs: 3.6,
    fat: 7.6,
    fiber: 0.6,
    calcium: 138,
    potassium: 154,
    sodium: 7,
    magnesium: 63,
    iron: 1.9,
  }, ["豆腐"]),
  makeFood("greek-yogurt", "希腊酸奶", "乳制品", 100, "g", {
    kcal: 59,
    protein: 10,
    carbs: 3.6,
    fat: 0.4,
    calcium: 110,
    potassium: 141,
    sodium: 36,
    magnesium: 11,
    vitaminD: 0.1,
    cholesterol: 5,
  }, ["无糖酸奶", "酸奶"]),
  makeFood("whole-wheat-bread", "全麦面包", "主食", 1, "片", {
    kcal: 80,
    protein: 4,
    carbs: 14,
    fat: 1.2,
    fiber: 2,
    calcium: 40,
    potassium: 80,
    sodium: 140,
    magnesium: 22,
    iron: 1,
  }, ["全麦吐司"]),
  makeFood("olive-oil", "橄榄油", "油脂", 10, "g", {
    kcal: 90,
    fat: 10,
  }),
  makeFood("avocado", "牛油果", "水果", 100, "g", {
    kcal: 160,
    protein: 2,
    carbs: 8.5,
    fat: 14.7,
    fiber: 6.7,
    calcium: 12,
    potassium: 485,
    sodium: 7,
    magnesium: 29,
    iron: 0.6,
    vitaminC: 10,
  }),
  makeFood("shrimp", "虾仁", "肉鱼", 100, "g", {
    kcal: 99,
    protein: 24,
    carbs: 0.2,
    fat: 0.3,
    calcium: 70,
    potassium: 259,
    sodium: 111,
    magnesium: 39,
    iron: 0.5,
    cholesterol: 189,
  }),
  makeFood("salmon", "三文鱼", "肉鱼", 100, "g", {
    kcal: 208,
    protein: 20,
    fat: 13,
    calcium: 9,
    potassium: 363,
    sodium: 59,
    magnesium: 27,
    iron: 0.3,
    vitaminD: 10,
    cholesterol: 55,
  }),
  makeFood("tuna-can", "金枪鱼罐头", "肉鱼", 100, "g", {
    kcal: 132,
    protein: 29,
    fat: 1,
    calcium: 10,
    potassium: 237,
    sodium: 320,
    magnesium: 34,
    iron: 1.3,
    vitaminD: 1.7,
    cholesterol: 47,
  }),
  makeFood("beef-cooked", "牛肉", "肉鱼", 100, "g", {
    kcal: 250,
    protein: 26,
    fat: 15,
    calcium: 18,
    potassium: 318,
    sodium: 72,
    magnesium: 21,
    iron: 2.6,
    cholesterol: 90,
  }),
  makeFood("pork-loin", "猪里脊", "肉鱼", 100, "g", {
    kcal: 143,
    protein: 21,
    fat: 6,
    calcium: 5,
    potassium: 360,
    sodium: 56,
    magnesium: 25,
    iron: 0.8,
    cholesterol: 65,
  }),
  makeFood("potato", "土豆", "主食", 100, "g", {
    kcal: 77,
    protein: 2,
    carbs: 17,
    fat: 0.1,
    fiber: 2.2,
    calcium: 12,
    potassium: 425,
    sodium: 6,
    magnesium: 23,
    iron: 0.8,
    vitaminC: 19.7,
  }),
  makeFood("noodles-cooked", "面条", "主食", 100, "g", {
    kcal: 137,
    protein: 4.5,
    carbs: 25,
    fat: 2.1,
    fiber: 1.2,
    calcium: 8,
    potassium: 38,
    sodium: 4,
    magnesium: 18,
    iron: 1,
  }, ["熟面条"]),
];

let profile = normalizeProfile(loadJson(STORAGE_KEYS.profile, {}));
let aiSettings = normalizeAiSettings(loadJson(STORAGE_KEYS.aiSettings, {}));
let hiddenQuickFoodIds = new Set(loadJson(STORAGE_KEYS.hiddenQuickFoods, []));
let foodLibrary = mergeFoodLibrary(loadJson(STORAGE_KEYS.foods, []));
let records = loadJson(STORAGE_KEYS.records, {});
let selectedDate = todayIso();
let selectedMeal = "早餐";
let selectedCategory = "全部";
let lastParsed = null;
let saveTimer = null;
let autoAuditTimer = null;
let aiAuditRunId = 0;
let aiInputImages = [];

const els = {
  recordDate: document.getElementById("recordDate"),
  dailyWeight: document.getElementById("dailyWeight"),
  waterStatus: document.getElementById("waterStatus"),
  jumpTodayBtn: document.getElementById("jumpTodayBtn"),
  saveStatus: document.getElementById("saveStatus"),
  saveBtn: document.getElementById("saveBtn"),
  copyReportBtn: document.getElementById("copyReportBtn"),
  interpretAiBtn: document.getElementById("interpretAiBtn"),
  copyInputBtn: document.getElementById("copyInputBtn"),
  copyPreviousBtn: document.getElementById("copyPreviousBtn"),
  sampleBtn: document.getElementById("sampleBtn"),
  clearBtn: document.getElementById("clearBtn"),
  dietText: document.getElementById("dietText"),
  editorPanel: document.querySelector(".editor-panel"),
  dropOverlay: document.getElementById("dropOverlay"),
  aiImageInput: document.getElementById("aiImageInput"),
  aiCameraInput: document.getElementById("aiCameraInput"),
  clearImagesBtn: document.getElementById("clearImagesBtn"),
  aiInputStatus: document.getElementById("aiInputStatus"),
  imagePreviewList: document.getElementById("imagePreviewList"),
  aiAnswerBox: document.getElementById("aiAnswerBox"),
  aiAuditBox: document.getElementById("aiAuditBox"),
  unmatchedBox: document.getElementById("unmatchedBox"),
  todayStats: document.getElementById("todayStats"),
  statsGrid: document.getElementById("statsGrid"),
  trendBars: document.getElementById("trendBars"),
  historyList: document.getElementById("historyList"),
  report: document.getElementById("report"),
  foodSearch: document.getElementById("foodSearch"),
  categoryTabs: document.getElementById("categoryTabs"),
  quickFoodList: document.getElementById("quickFoodList"),
  importFile: document.getElementById("importFile"),
  importBtn: document.getElementById("importBtn"),
  exportBtn: document.getElementById("exportBtn"),
  addFoodBtn: document.getElementById("addFoodBtn"),
  targetPreview: document.getElementById("targetPreview"),
  profileSavedNotice: document.getElementById("profileSavedNotice"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  aiPendingFoods: document.getElementById("aiPendingFoods"),
  copyAiPromptBtn: document.getElementById("copyAiPromptBtn"),
  applyAiResultBtn: document.getElementById("applyAiResultBtn"),
  aiResultInput: document.getElementById("aiResultInput"),
  openaiApiKey: document.getElementById("openaiApiKey"),
  openaiModel: document.getElementById("openaiModel"),
  aiBaseUrl: document.getElementById("aiBaseUrl"),
  aiApiType: document.getElementById("aiApiType"),
  aiUseWebSearch: document.getElementById("aiUseWebSearch"),
  useTuringPresetBtn: document.getElementById("useTuringPresetBtn"),
  saveAiSettingsBtn: document.getElementById("saveAiSettingsBtn"),
  runAiLookupBtn: document.getElementById("runAiLookupBtn"),
  aiConfigStatus: document.getElementById("aiConfigStatus"),
};

const profileInputs = {
  age: document.getElementById("profileAge"),
  sex: document.getElementById("profileSex"),
  weight: document.getElementById("profileWeight"),
  targetWeight: document.getElementById("profileTargetWeight"),
  processType: document.getElementById("profileProcessType"),
};

const foodFormInputs = {
  name: document.getElementById("newFoodName"),
  category: document.getElementById("newFoodCategory"),
  qty: document.getElementById("newFoodQty"),
  unit: document.getElementById("newFoodUnit"),
  kcal: document.getElementById("newFoodKcal"),
  protein: document.getElementById("newFoodProtein"),
  carbs: document.getElementById("newFoodCarbs"),
  fat: document.getElementById("newFoodFat"),
  fiber: document.getElementById("newFoodFiber"),
};

initialise();

function initialise() {
  if (els.recordDate) els.recordDate.value = selectedDate;
  els.dietText.placeholder = SAMPLE_TEXT;
  syncProfileInputs();
  syncAiSettingsInputs();
  renderTargetPreview();
  loadSelectedRecord();
  bindEvents();
  renderQuickFoods();
  renderStatsAndHistory();
}

function bindEvents() {
  if (els.recordDate) {
    els.recordDate.addEventListener("change", () => {
      selectedDate = els.recordDate.value || todayIso();
      loadSelectedRecord();
    });
  }

  if (els.dailyWeight) {
    els.dailyWeight.addEventListener("input", () => {
      setSaveStatus("待AI解读并保存");
    });
  }

  if (els.waterStatus) {
    els.waterStatus.addEventListener("change", () => {
      updateReport();
      setSaveStatus("待AI解读并保存");
    });
  }

  els.dietText.addEventListener("input", () => {
    clearAiAuditResult();
    updateReport();
    setSaveStatus("待AI解读并保存");
  });

  if (els.jumpTodayBtn) {
    els.jumpTodayBtn.addEventListener("click", () => {
      selectedDate = todayIso();
      loadSelectedRecord();
    });
  }

  els.saveBtn.addEventListener("click", () => saveCurrent(false));
  els.copyReportBtn.addEventListener("click", copyReport);
  els.interpretAiBtn.addEventListener("click", runUnifiedAiInterpretation);
  els.copyInputBtn.addEventListener("click", copyAiInput);
  els.aiImageInput.addEventListener("change", handleAiImageInput);
  if (els.aiCameraInput) els.aiCameraInput.addEventListener("change", handleAiCameraInput);
  els.clearImagesBtn.addEventListener("click", clearAiImages);
  els.imagePreviewList.addEventListener("click", handleImagePreviewClick);
  els.editorPanel.addEventListener("paste", handleEditorPaste);
  els.editorPanel.addEventListener("dragenter", handleEditorDragEnter);
  els.editorPanel.addEventListener("dragover", handleEditorDragOver);
  els.editorPanel.addEventListener("dragleave", handleEditorDragLeave);
  els.editorPanel.addEventListener("drop", handleEditorDrop);
  els.copyPreviousBtn.addEventListener("click", copyPreviousDay);
  els.sampleBtn.addEventListener("click", () => {
    els.dietText.value = SAMPLE_TEXT;
    updateReport();
    setSaveStatus("示例已载入，待AI解读并保存");
  });
  els.clearBtn.addEventListener("click", clearCurrentDay);
  els.foodSearch.addEventListener("input", renderQuickFoods);
  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", importBackup);
  els.exportBtn.addEventListener("click", exportBackup);
  els.addFoodBtn.addEventListener("click", addCustomFood);
  els.copyAiPromptBtn.addEventListener("click", copyAiLookupPrompt);
  els.applyAiResultBtn.addEventListener("click", applyAiNutritionResult);
  els.useTuringPresetBtn.addEventListener("click", useTuringPreset);
  els.saveAiSettingsBtn.addEventListener("click", saveAiSettings);
  els.runAiLookupBtn.addEventListener("click", runAiNutritionLookup);

  Object.values(profileInputs).forEach((input) => {
    input.addEventListener("input", renderTargetPreview);
    input.addEventListener("change", renderTargetPreview);
  });

  document.querySelectorAll(".meal-tab").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMeal = button.dataset.meal;
      document.querySelectorAll(".meal-tab").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  els.saveProfileBtn.addEventListener("click", saveProfile);
  document.getElementById("resetProfileBtn").addEventListener("click", resetProfile);
}

function loadSelectedRecord() {
  const record = records[selectedDate];
  if (els.recordDate) els.recordDate.value = selectedDate;
  els.dietText.value = record?.rawText || "";
  if (els.dailyWeight) els.dailyWeight.value = record?.weight || "";
  if (els.waterStatus) els.waterStatus.value = normalizeWaterStatus(record?.waterStatus);
  clearAiAuditResult();
  updateReport();
  renderStatsAndHistory();
  setSaveStatus(record ? "已载入" : "新记录");
}

function updateReport() {
  lastParsed = parseDietText(els.dietText.value, foodLibrary);
  renderUnmatched(lastParsed.unmatched);
  renderReport(lastParsed);
  renderTodayStats(lastParsed.totals);
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCurrent(true), 650);
}

function saveCurrent(silent) {
  clearTimeout(saveTimer);
  const rawText = els.dietText.value.trim();
  const currentRecord = records[selectedDate];
  const weight = getUsableRecordedWeight(els.dailyWeight ? numberOrNull(els.dailyWeight.value) : currentRecord?.weight ?? null);
  const waterStatus = normalizeWaterStatus(els.waterStatus?.value || currentRecord?.waterStatus);

  if (!rawText) {
    delete records[selectedDate];
    storeJson(STORAGE_KEYS.records, records);
    renderStatsAndHistory();
    clearAiAuditResult();
    setSaveStatus("已清空");
    return;
  }

  let parsed = parseDietText(rawText, foodLibrary);
  const learnedCount = silent ? 0 : learnFoodsFromParsed(parsed, selectedDate);
  if (learnedCount) {
    storeJson(STORAGE_KEYS.foods, foodLibrary);
    parsed = parseDietText(rawText, foodLibrary);
  }

  records[selectedDate] = {
    date: selectedDate,
    rawText,
    weight,
    waterStatus,
    totals: parsed.totals,
    meals: parsed.meals.map((meal) => ({
      name: meal.name,
      totals: meal.totals,
      items: meal.items.map((item) => ({
        name: item.name,
        foodId: item.foodId,
        amountLabel: item.amountLabel,
        nutrients: item.nutrients,
        matched: item.matched,
      })),
    })),
    updatedAt: new Date().toISOString(),
  };
  storeJson(STORAGE_KEYS.records, records);
  lastParsed = parsed;
  renderUnmatched(parsed.unmatched);
  renderReport(parsed);
  renderStatsAndHistory();
  renderQuickFoods();
  const learnedText = learnedCount ? ` · 新增${learnedCount}个快捷食物` : "";
  setSaveStatus(`${silent ? "已保存" : "已覆盖当天记录"}${learnedText}`);
  queueAiReportAudit();
}

function setSaveStatus(text) {
  els.saveStatus.textContent = `${text} · ${selectedDate}`;
}

function parseDietText(text, foods) {
  const meals = MEALS.map((name) => ({
    name,
    items: [],
    totals: emptyNutrients(),
  }));
  let currentMeal = meals[0];
  const unmatched = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((sourceLine, index) => {
    const line = stripBoundaryDateCue(sourceLine, index === 0, index === lines.length - 1);
    if (!line) return;
    const mealName = detectMealHeader(line);
    if (mealName) {
      currentMeal = meals.find((meal) => meal.name === mealName) || meals[0];
      return;
    }

    const item = parseFoodLine(line, foods);
    if (!item.name) return;
    currentMeal.items.push(item);
    currentMeal.totals = addNutrients(currentMeal.totals, item.nutrients);
    if (!item.matched) unmatched.push(item.raw);
  });

  const totals = meals.reduce((result, meal) => addNutrients(result, meal.totals), emptyNutrients());
  return { meals, totals, unmatched };
}

function parseFoodLine(line, foods) {
  const raw = line;
  const cleaned = line
    .replace(/^\s*(?:[-*•]|[0-9０-９]+[\s.、)）-]*)\s*/, "")
    .replace(/[；;]/g, "，")
    .trim();

  const food = findFood(cleaned, foods);
  const amount = extractAmount(cleaned, food);
  const nutrients = food && !food.needsNutrition ? scaleNutrients(food, amount) : emptyNutrients();
  const inferredName = food ? food.name : inferName(cleaned);

  return {
    raw,
    name: inferredName,
    foodId: food?.id || null,
    amountLabel: formatAmountLabel(amount),
    nutrients,
    matched: Boolean(food && !food.needsNutrition),
  };
}

function findFood(line, foods) {
  const normalLine = normalizeText(line);
  const inferredKey = normalizeText(inferName(line));
  let best = null;
  let bestScore = 0;

  foods.forEach((food) => {
    [food.name, ...(food.aliases || [])].forEach((term) => {
      const normalTerm = normalizeText(term);
      if (!normalTerm || !normalLine.includes(normalTerm)) return;
      if (isOverGenericAliasMatch(line, inferredKey, normalTerm, food)) return;
      if (isNutrientDescriptorAliasMatch(line, normalTerm, food)) return;
      if (packagedNutritionDiffersFromFood(line, food)) return;
      const score = normalTerm.length * 10 - normalLine.indexOf(normalTerm);
      if (score > bestScore) {
        best = food;
        bestScore = score;
      }
    });
  });

  return best;
}

function isOverGenericAliasMatch(line, inferredKey, normalTerm, food) {
  if (!GENERIC_FOOD_ALIAS_TERMS.has(normalTerm)) return false;
  if (extractPackagedNutritionFacts(line) && inferredKey === normalTerm) return true;
  if (!inferredKey || inferredKey === normalTerm || inferredKey === normalizeText(food.name)) return false;
  return inferredKey.includes(normalTerm);
}

function isNutrientDescriptorAliasMatch(line, normalTerm, food) {
  if (normalTerm !== "蛋白" || food.id !== "egg-white") return false;
  return Boolean(extractPackagedNutritionFacts(line)?.values.protein);
}

function extractPackagedNutritionFacts(text) {
  const rawText = String(text || "");
  const servingUnitMatch = rawText.match(/(?:[\/／]\s*100\s*(ml|毫升|g|克)|每\s*100\s*(ml|毫升|g|克))/i);
  if (!servingUnitMatch) return null;

  const servingUnit = normalizeUnit(servingUnitMatch[1] || servingUnitMatch[2]);
  const values = {};

  PACKAGED_NUTRIENT_RULES.forEach((rule) => {
    const namePattern = rule.names.join("|");
    const patterns = [
      new RegExp(`(?:${namePattern})\\D{0,10}(\\d+(?:\\.\\d+)?)\\s*${rule.unitPattern}\\s*[\/／]\\s*100\\s*(?:ml|毫升|g|克)`, "i"),
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${rule.unitPattern}\\s*[\/／]\\s*100\\s*(?:ml|毫升|g|克)\\s*(?:${namePattern})`, "i"),
      new RegExp(`每\\s*100\\s*(?:ml|毫升|g|克)\\D{0,18}(?:${namePattern})\\D{0,10}(\\d+(?:\\.\\d+)?)\\s*${rule.unitPattern}`, "i"),
    ];
    const match = patterns.map((pattern) => rawText.match(pattern)).find(Boolean);
    const value = match ? Number(match[1]) : null;
    if (Number.isFinite(value) && value >= 0) values[rule.key] = value;
  });

  return Object.keys(values).length ? { unit: servingUnit, values } : null;
}

function packagedNutritionDiffersFromFood(line, food) {
  const facts = extractPackagedNutritionFacts(line);
  if (!facts || !food || food.needsNutrition) return false;
  let compared = false;

  const differs = Object.entries(facts.values).some(([key, value]) => {
    const knownValue = foodNutrientPer100(food, key, facts.unit);
    if (knownValue === null) return false;
    compared = true;
    return Math.abs(value - knownValue) > nutrientDifferenceTolerance(key, knownValue);
  });
  return differs || !compared;
}

function foodNutrientPer100(food, key, unit) {
  if (!food || food.unit !== unit || !Number(food.qty)) return null;
  const value = Number(food.nutrients?.[key]);
  if (!Number.isFinite(value)) return null;
  return (value * 100) / Number(food.qty);
}

function nutrientDifferenceTolerance(key, knownValue) {
  if (key === "kcal") return Math.max(5, Math.abs(knownValue) * 0.08);
  if (["sodium", "calcium", "potassium", "magnesium"].includes(key)) return Math.max(5, Math.abs(knownValue) * 0.15);
  return Math.max(0.3, Math.abs(knownValue) * 0.08);
}

function formatPackagedNutritionVariantName(baseName, facts) {
  if (!facts) return baseName;
  const preferredKeys = ["protein", "kcal", "carbs", "fat", "fiber", "sodium"];
  const key = preferredKeys.find((item) => facts.values[item] !== undefined);
  const rule = PACKAGED_NUTRIENT_RULES.find((item) => item.key === key);
  if (!rule) return baseName;
  const value = facts.values[key];
  const precision = Number.isInteger(value) ? 0 : 1;
  const unit = key === "kcal" ? "kcal" : key === "sodium" ? "mg" : "g";
  const servingUnitText = facts.unit === "ml" ? "100ml" : "100g";
  return `${baseName}${rule.label}${fmt(value, precision)}${unit}每${servingUnitText}`;
}

function normalizedTextUsesConflictingKnownFood(originalText, normalizedText) {
  if (!extractPackagedNutritionFacts(originalText) || !String(normalizedText || "").trim()) return false;
  const parsed = parseDietText(normalizedText, foodLibrary);
  return parsed.meals.some((meal) =>
    meal.items.some((item) => {
      const food = item.foodId ? foodLibrary.find((candidate) => candidate.id === item.foodId) : null;
      return food && packagedNutritionDiffersFromFood(originalText, food);
    }),
  );
}

function hasExplicitPackagedNutritionVariant(text) {
  return Boolean(extractPackagedNutritionFacts(text));
}

function extractAmount(line, food) {
  const defaultAmount = food
    ? { qty: food.qty, unit: food.unit, rawQty: food.qty }
    : { qty: 1, unit: "份", rawQty: 1 };
  const amounts = [];
  const pattern =
    /((?:\d+(?:\.\d+)?)|[一二两三四五六七八九十半]+)\s*(千克|公斤|kg|KG|克|g|G|毫升|ml|ML|mL|个|颗|根|盒|份|勺|片|条|碗|杯|罐|袋|只)/g;
  let match = pattern.exec(line);

  while (match) {
    const previousChar = line[match.index - 1];
    const nextChar = line[match.index + match[0].length];
    const unit = normalizeUnit(match[2]);
    const number = parseAmountNumber(match[1]);
    if (number !== null && previousChar !== "/" && nextChar !== "/") {
      const normalized = normalizeAmountQty(number, unit);
      amounts.push({
        qty: normalized.qty,
        unit: normalized.unit,
        rawQty: number,
      });
    }
    match = pattern.exec(line);
  }

  if (!amounts.length) return defaultAmount;
  if (!food) return amounts[0];

  const compatible = amounts.find((amount) => amount.unit === food.unit);
  if (compatible) return compatible;

  return defaultAmount;
}

function normalizeUnit(unit) {
  if (["克", "g", "G"].includes(unit)) return "g";
  if (["千克", "公斤", "kg", "KG"].includes(unit)) return "kg";
  if (["毫升", "ml", "ML", "mL"].includes(unit)) return "ml";
  return unit;
}

function normalizeAmountQty(qty, unit) {
  if (unit === "kg") return { qty: qty * 1000, unit: "g" };
  return { qty, unit };
}

function parseAmountNumber(value) {
  if (/^\d/.test(value)) return Number(value);
  if (value === "半") return 0.5;

  const map = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  if (value === "十") return 10;
  if (value.includes("十")) {
    const [tens, ones] = value.split("十");
    const tenValue = tens ? map[tens] || 1 : 1;
    return tenValue * 10 + (ones ? map[ones] || 0 : 0);
  }

  return map[value] ?? null;
}

function inferName(line) {
  const baseName = line
    .replace(/^\s*(?:[-*•]|[0-9０-９]+[\s.、)）-]*)\s*/, "")
    .split(/[，,、\s]/)[0]
    .replace(/(?:\d+(?:\.\d+)?|[一二两三四五六七八九十半]+)(?:千克|公斤|kg|KG|克|g|G|毫升|ml|ML|mL|个|颗|根|盒|份|勺|片|条|碗|杯|罐|袋|只)/g, "")
    .trim();
  const facts = extractPackagedNutritionFacts(line);
  if (facts) return formatPackagedNutritionVariantName(baseName, facts);
  return baseName;
}

function detectMealHeader(line) {
  const normalized = line.replace(/\s/g, "");
  return MEALS.find((meal) => new RegExp(`^${meal}[:：]?$`).test(normalized));
}

function scaleNutrients(food, amount) {
  const factor = amount.unit === food.unit ? amount.qty / food.qty : 1;
  return NUTRIENT_KEYS.reduce((result, key) => {
    result[key] = Number(((food.nutrients[key] || 0) * factor).toFixed(3));
    return result;
  }, {});
}

function emptyNutrients() {
  return NUTRIENT_KEYS.reduce((result, key) => {
    result[key] = 0;
    return result;
  }, {});
}

function addNutrients(a, b) {
  return NUTRIENT_KEYS.reduce((result, key) => {
    result[key] = Number(((a[key] || 0) + (b[key] || 0)).toFixed(3));
    return result;
  }, {});
}

function renderReport(parsed) {
  if (!els.dietText.value.trim()) {
    els.report.innerHTML = `<div class="empty-state">输入三餐内容后这里会生成报告</div>`;
    return;
  }

  els.report.innerHTML = [
    renderBaseSection(),
    renderMealSection(parsed),
    renderTotalSection(parsed.totals),
    renderGapSection(parsed.totals),
    renderEvaluationSection(parsed.totals),
    renderWeightSection(parsed.totals),
    renderFinalSection(parsed.totals),
  ].join("");
}

function renderBaseSection() {
  const process = PROCESS_TYPES[profile.processType] || PROCESS_TYPES.muscle_loss;
  return section(
    "1. 基础代谢与目标",
    `
      ${table(
        ["项目", "数值"],
        [
          ["年龄", `${fmt(profile.age, 0)}岁`],
          ["性别", profile.sex === "female" ? "女" : "男"],
          ["当前体重", `${fmt(profile.weight, 1)}kg`],
          ["目标体重", `${fmt(profile.targetWeight, 1)}kg`],
          ["过程类型", process.label],
          ["基础代谢 BMR（估算）", `约${fmt(profile.bmr, 0)} kcal/天`],
          ["久坐日总消耗 TDEE（估算）", `约${fmt(profile.tdeeRest, 0)} kcal/天`],
          ["轻活动日总消耗（估算）", `约${fmt(profile.tdeeLight, 0)} kcal/天`],
        ],
      )}
      <p class="report-note">因未输入身高和体脂，基础代谢按年龄、性别和体重做粗略估算；后续可用实际体重趋势继续校准。</p>
      <h3>减脂/保肌目标:</h3>
      ${table(
        ["项目", "建议目标"],
        [
          ["热量", `${fmt(profile.calMin, 0)}-${fmt(profile.calMax, 0)} kcal/天`],
          ["蛋白质", `${fmt(profile.proteinMin, 0)}-${fmt(profile.proteinMax, 0)}g/天`],
          ["碳水", `${fmt(profile.carbMin, 0)}-${fmt(profile.carbMax, 0)}g/天`],
          ["脂肪", `${fmt(profile.fatMin, 0)}-${fmt(profile.fatMax, 0)}g/天`],
          ["膳食纤维", `${fmt(profile.fiberMin, 0)}-${fmt(profile.fiberMax, 0)}g/天`],
        ],
      )}
    `,
  );
}

function renderMealSection(parsed) {
  const mealHtml = parsed.meals
    .filter((meal) => meal.items.length)
    .map((meal) => {
      const rows = meal.items.map((item) => [
        `${escapeHtml(item.name)}${item.matched ? "" : "（待补充）"}`,
        nutrientText(item.nutrients.kcal, "kcal", 0),
        nutrientText(item.nutrients.protein, "g", 1),
        nutrientText(item.nutrients.carbs, "g", 1),
        nutrientText(item.nutrients.fat, "g", 1),
      ]);
      rows.push([
        `${meal.name}合计`,
        `约${fmt(meal.totals.kcal, 0)} kcal`,
        `约${fmt(meal.totals.protein, 1)}g`,
        `约${fmt(meal.totals.carbs, 1)}g`,
        `约${fmt(meal.totals.fat, 1)}g`,
      ]);
      return `
        <h3>${meal.name}</h3>
        ${table(["食物", "热量", "蛋白质", "碳水", "脂肪"], rows, rows.length - 1)}
      `;
    })
    .join("");

  return section("2. 三餐摄入估算", mealHtml || `<p class="report-note">暂无餐次数据。</p>`);
}

function renderTotalSection(totals) {
  const rows = [
    ["总热量", `约${fmt(totals.kcal, 0)} kcal`],
    ["蛋白质", `约${fmt(totals.protein, 1)}g`],
    ["碳水", `约${fmt(totals.carbs, 1)}g`],
    ["脂肪", `约${fmt(totals.fat, 1)}g`],
    ["膳食纤维", `约${fmt(totals.fiber, 1)}g`],
    ["钙", `约${fmt(totals.calcium, 0)}mg`],
    ["钾", `约${fmt(totals.potassium, 0)}mg`],
    ["钠", `约${fmt(totals.sodium, 0)}mg左右`],
    ["镁", `约${fmt(totals.magnesium, 0)}mg`],
    ["铁", `约${fmt(totals.iron, 1)}mg`],
    ["维生素C", `约${fmt(totals.vitaminC, 1)}mg`],
    ["维生素D", `约${fmt(totals.vitaminD, 1)}μg`],
    ["胆固醇", `约${fmt(totals.cholesterol, 0)}mg左右`],
  ];
  return section("3. 全天总摄入", table(["营养素", "全天摄入"], rows));
}

function renderGapSection(totals) {
  const rows = buildComparisonRows(totals).map((row) => [
    row.label,
    row.intake,
    row.target,
    row.diff,
    `<span class="${row.className}">${row.judgement}</span>`,
  ]);

  return section("4. 营养差", table(["项目", "你的摄入", "建议/需求", "差值", "判断"], rows));
}

function renderEvaluationSection(totals) {
  const paragraphs = buildEvaluation(totals)
    .map((item) => `<p><strong>${item.title}</strong><br>${item.body}</p>`)
    .join("");
  return section("5. 核心评价", `<div class="evaluation-list">${paragraphs}</div>`);
}

function weightRange(min, max) {
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

function sumWeightRanges(...ranges) {
  return ranges.reduce(
    (result, range) => weightRange(result.min + (range?.min || 0), result.max + (range?.max || 0)),
    weightRange(0, 0),
  );
}

function scaleWeightRange(range, factor) {
  return weightRange(range.min * factor, range.max * factor);
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampWeightRange(range, min, max) {
  return weightRange(clampValue(range.min, min, max), clampValue(range.max, min, max));
}

function normalizeSignedZero(value) {
  return Math.abs(value) < 0.0005 ? 0 : value;
}

function formatSignedWeight(value, precision = 2) {
  const safeValue = normalizeSignedZero(value);
  return `${safeValue > 0 ? "+" : ""}${fmt(safeValue, precision)}`;
}

function formatSignedWeightRange(range, precision = 2, unit = "kg", multiplier = 1) {
  const min = normalizeSignedZero(range.min * multiplier);
  const max = normalizeSignedZero(range.max * multiplier);
  return `${formatSignedWeight(min, precision)}到${formatSignedWeight(max, precision)}${unit}`;
}

function formatWaterWeightRange(range) {
  const min = normalizeSignedZero(range.min);
  const max = normalizeSignedZero(range.max);
  if (min === 0 && max === 0) return "0kg";
  return formatSignedWeightRange(range, 2);
}

function formatSignedRange(min, max, precision = 1, unit = "") {
  const range = weightRange(min, max);
  return `${formatSignedWeight(range.min, precision)}到${formatSignedWeight(range.max, precision)}${unit}`;
}

function formatAbsoluteWeightRange(range, precision = 1, unit = "kg") {
  const min = normalizeSignedZero(range.min);
  const max = normalizeSignedZero(range.max);
  if (Math.abs(min - max) < 0.0005) return `${fmt(min, precision)}${unit}`;
  return `${fmt(min, precision)}到${fmt(max, precision)}${unit}`;
}

function getRecordTotals(record) {
  return record?.totals || parseDietText(record?.rawText || "", foodLibrary).totals;
}

function getUsableRecordedWeight(weight) {
  const numericWeight = numberOrNull(weight);
  if (numericWeight === null) return null;
  if (numericWeight < 20 || numericWeight > 250) return null;

  const anchors = [profile.weight, profile.targetWeight]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (!anchors.length) return numericWeight;

  const tolerance = Math.max(25, Math.abs((profile.weight || 0) - (profile.targetWeight || 0)) + 12);
  const closestDiff = Math.min(...anchors.map((anchor) => Math.abs(numericWeight - anchor)));
  return closestDiff <= tolerance ? numericWeight : null;
}

function countPriorLowCarbStreak(referenceDate = selectedDate) {
  const recordList = Object.values(records)
    .filter((record) => record.rawText && record.date < referenceDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  let streak = 0;
  let nextDate = referenceDate;
  for (let index = recordList.length - 1; index >= 0; index -= 1) {
    const record = recordList[index];
    if (daysBetween(record.date, nextDate) !== 1) break;
    if (getRecordTotals(record).carbs >= profile.carbMin) break;
    streak += 1;
    nextDate = record.date;
  }

  return streak;
}

function estimateGlycogenRange(totals, referenceDate = selectedDate) {
  const priorLowCarbDays = countPriorLowCarbStreak(referenceDate);

  if (totals.carbs >= profile.carbMin) {
    return {
      range: priorLowCarbDays >= 2 ? weightRange(0, 0.05) : weightRange(-0.01, 0.02),
      priorLowCarbDays,
    };
  }

  if (priorLowCarbDays === 0) return { range: weightRange(-0.08, -0.03), priorLowCarbDays };
  if (priorLowCarbDays === 1) return { range: weightRange(-0.05, -0.02), priorLowCarbDays };
  if (priorLowCarbDays === 2) return { range: weightRange(-0.03, -0.01), priorLowCarbDays };
  return { range: weightRange(-0.015, 0), priorLowCarbDays };
}

function estimateSodiumWaterRange(sodium) {
  if (sodium > profile.sodiumMax) return weightRange(0.1, 0.5);
  if (sodium < 1500) return weightRange(-0.15, 0);
  return weightRange(-0.05, 0);
}

function normalizeWaterStatus(status) {
  return WATER_STATUS_OPTIONS[status] ? status : "normal";
}

function getWaterStatusForDate(referenceDate = selectedDate) {
  if (referenceDate === selectedDate && els.waterStatus) return normalizeWaterStatus(els.waterStatus.value);
  return normalizeWaterStatus(records[referenceDate]?.waterStatus);
}

function estimateManualWaterRange(status) {
  const option = WATER_STATUS_OPTIONS[normalizeWaterStatus(status)];
  return weightRange(option.range[0], option.range[1]);
}

function buildDailyWeightModel(totals, referenceDate = selectedDate) {
  const deficit = profile.tdeeRest - totals.kcal;
  const pureFat = deficit / 7700;
  const pureFatEquivalentKg = Math.max(0, pureFat);
  const fatLow = Math.max(0, pureFat * 0.75);
  const fatHigh = Math.max(0, pureFat);
  const fatRange =
    deficit > 0 ? weightRange(-fatHigh, -fatLow) : weightRange(0, Math.abs(pureFat) * 0.5);
  const muscleRange =
    totals.protein >= profile.proteinMin ? weightRange(-0.02, 0) : weightRange(-0.08, -0.02);
  const glycogenModel = estimateGlycogenRange(totals, referenceDate);
  const glycogenRange = glycogenModel.range;
  const waterRange = scaleWeightRange(glycogenRange, 3);
  const sodiumWaterRange = estimateSodiumWaterRange(totals.sodium);
  const waterStatus = getWaterStatusForDate(referenceDate);
  const manualWaterRange = estimateManualWaterRange(waterStatus);
  const gutRange =
    totals.fiber < profile.fiberMin || totals.kcal < profile.calMin ? weightRange(-0.3, -0.1) : weightRange(-0.1, 0.1);
  const totalRange = sumWeightRanges(fatRange, muscleRange, glycogenRange, waterRange, sodiumWaterRange, manualWaterRange, gutRange);

  return {
    deficit,
    pureFat,
    pureFatEquivalentKg,
    fatRange,
    muscleRange,
    glycogenRange,
    waterRange,
    sodiumWaterRange,
    manualWaterRange,
    waterStatus,
    gutRange,
    totalRange,
    priorLowCarbDays: glycogenModel.priorLowCarbDays,
  };
}

function getRecordsSinceWeightCalibration(recordList) {
  const calibrationDate = profile.weightCalibratedAt || null;
  return calibrationDate ? recordList.filter((record) => record.date >= calibrationDate) : recordList;
}

function buildCumulativeWeightModel(recordList) {
  return buildCumulativeWeightModelFromEntries(
    getRecordsSinceWeightCalibration(recordList).map((record) => ({
      date: record.date,
      totals: getRecordTotals(record),
    })),
  );
}

function buildCumulativeWeightModelFromEntries(entries) {
  const sortedEntries = (entries || [])
    .filter((entry) => entry?.totals)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  const result = sortedEntries.reduce(
    (summary, entry) => {
      const model = buildDailyWeightModel(entry.totals, entry.date);
      return {
        fatRange: sumWeightRanges(summary.fatRange, model.fatRange),
        muscleRange: sumWeightRanges(summary.muscleRange, model.muscleRange),
        glycogenWaterRawRange: sumWeightRanges(summary.glycogenWaterRawRange, model.glycogenRange, model.waterRange),
        transientRange: sumWeightRanges(model.sodiumWaterRange, model.manualWaterRange, model.gutRange),
        dayCount: summary.dayCount + 1,
      };
    },
    {
      fatRange: weightRange(0, 0),
      muscleRange: weightRange(0, 0),
      glycogenWaterRawRange: weightRange(0, 0),
      transientRange: weightRange(0, 0),
      dayCount: 0,
    },
  );

  const glycogenWaterRange = clampWeightRange(
    result.glycogenWaterRawRange,
    CUMULATIVE_GLYCOGEN_WATER_MIN_KG,
    CUMULATIVE_GLYCOGEN_WATER_MAX_KG,
  );

  return {
    ...result,
    glycogenWaterRange,
    totalRange: sumWeightRanges(result.fatRange, result.muscleRange, glycogenWaterRange, result.transientRange),
  };
}

function buildWeightEstimateTimeline(currentTotals, referenceDate = selectedDate) {
  const recordList = Object.values(records)
    .filter((record) => record.rawText && record.date < referenceDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => ({
      date: record.date,
      weight: getUsableRecordedWeight(record.weight),
      totals: getRecordTotals(record),
    }));

  const currentRecord = records[referenceDate];
  const hasCurrentRecord = Boolean((referenceDate === selectedDate ? els.dietText.value.trim() : currentRecord?.rawText) || currentRecord?.rawText);

  if (hasCurrentRecord) {
    recordList.push({
      date: referenceDate,
      weight: getUsableRecordedWeight(currentRecord?.weight),
      totals: currentTotals,
    });
  }

  return recordList;
}

function estimateTheoreticalWeight(currentTotals, referenceDate = selectedDate) {
  const calibrationDate = profile.weightCalibratedAt || null;
  const timeline = buildWeightEstimateTimeline(currentTotals, referenceDate).filter(
    (entry) => !calibrationDate || entry.date >= calibrationDate,
  );
  let baseWeight = profile.weight;
  let baseLabel = calibrationDate ? `${calibrationDate} 校准 ${fmt(profile.weight, 1)}kg` : `按设置体重估算 ${fmt(profile.weight, 1)}kg`;
  let calibrationMode = calibrationDate ? "manual" : "profile-estimate";
  let startIndex = 0;

  const firstWeightedIndex = calibrationDate ? -1 : timeline.findIndex((entry) => typeof entry.weight === "number");
  if (firstWeightedIndex >= 0) {
    baseWeight = timeline[firstWeightedIndex].weight;
    baseLabel = `${timeline[firstWeightedIndex].date} 实测 ${fmt(baseWeight, 1)}kg`;
    calibrationMode = "recorded-weight";
    startIndex = firstWeightedIndex + 1;
  }

  const changeModel = buildCumulativeWeightModelFromEntries(timeline.slice(startIndex));
  const changeRange = changeModel.totalRange;

  return {
    baseWeight,
    baseLabel,
    calibrationMode,
    changeRange,
    range: weightRange(baseWeight + changeRange.min, baseWeight + changeRange.max),
  };
}

function buildRecentRecordPromptContext(limit = 5) {
  const recordList = Object.values(records)
    .filter((record) => record.rawText && record.date < selectedDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit);

  if (!recordList.length) return "最近暂无已保存饮食记录。";

  return recordList
    .map((record) => {
      const totals = getRecordTotals(record);
      const usableWeight = getUsableRecordedWeight(record.weight);
      const weightText = typeof usableWeight === "number" ? `，体重${fmt(usableWeight, 1)}kg` : "";
      return `- ${record.date}: 热量${fmt(totals.kcal, 0)}kcal，蛋白${fmt(totals.protein, 1)}g，碳水${fmt(totals.carbs, 1)}g，钠${fmt(totals.sodium, 0)}mg${weightText}`;
    })
    .join("\n");
}

function renderWeightSection(totals) {
  const weightModel = buildDailyWeightModel(totals, selectedDate);
  const glycogenNote =
    weightModel.priorLowCarbDays >= 3
      ? `前面已连续低碳 ${weightModel.priorLowCarbDays} 天，今天糖原继续下降的空间已经明显变小`
      : weightModel.priorLowCarbDays >= 1
        ? `前面已连续低碳 ${weightModel.priorLowCarbDays} 天，今天糖原下降会比第一天更收敛`
        : "如果这是第一天明显低碳，糖原下降通常会更明显一些";

  const componentRows = [
    [
      "脂肪变",
      `约 ${formatSignedWeightRange(weightModel.fatRange, 0, "g", 1000)}`,
      weightModel.deficit > 0 ? "久坐缺口越大，脂肪动员占比越高" : "久坐缺口没有形成，脂肪下降不明显",
    ],
    [
      "肌肉变",
      `约 ${formatSignedWeightRange(weightModel.muscleRange, 0, "g", 1000)}`,
      totals.protein >= profile.proteinMin ? "蛋白质达标时，短期肌肉损失风险较低" : "蛋白质不足时，保肌压力会上升",
    ],
    [
      "肌糖原",
      `约 ${formatSignedWeightRange(weightModel.glycogenRange, 2)}`,
      totals.carbs < profile.carbMin ? glycogenNote : "碳水接近目标时，糖原更可能保持稳定或小幅回补",
    ],
    [
      "糖原结合水",
      `约 ${formatSignedWeightRange(weightModel.waterRange, 2)}`,
      "1g 糖原通常会带 3g 左右水分，但这个缓冲不会按同样幅度天天下降",
    ],
    [
      "钠相关水分",
      sodiumWaterText(totals.sodium),
      "钠、饮水和出汗会让第二天体重出现短期偏移",
    ],
    [
      "额外水分状态",
      `约 ${formatWaterWeightRange(weightModel.manualWaterRange)}`,
      WATER_STATUS_OPTIONS[weightModel.waterStatus].note,
    ],
    [
      "肠道内容物",
      `约 ${formatSignedWeightRange(weightModel.gutRange, 1)}`,
      "进食总量、纤维和排空节奏都会影响秤上数字",
    ],
  ];

  const tomorrowRows = [
    ["脂肪变", weightModel.deficit > 0 ? `约 ${formatSignedWeightRange(weightModel.fatRange, 0, "g", 1000)}` : "变化不明显"],
    ["总体重", `约 ${formatSignedWeightRange(weightModel.totalRange, 2)}`],
    ["糖原结合水提醒", weightModel.priorLowCarbDays >= 2 ? "近期已连续低碳，后续糖原和水分下降空间会变小" : "如果刚开始低碳，前两天的秤重波动通常更明显"],
  ];

  return section(
    "6. 今日体重理论变化拆分",
    `
      <p>按久坐日消耗约<strong>${fmt(profile.tdeeRest, 0)} kcal</strong>计算:</p>
      ${table(
        ["项目", "数值"],
        [
          ["今日摄入", `约${fmt(totals.kcal, 0)} kcal`],
          ["久坐日消耗", `约${fmt(profile.tdeeRest, 0)} kcal`],
          ["久坐缺口", `约${formatEnergyDeficit(weightModel.deficit)}`],
        ],
      )}
      <p>如果把久坐缺口全部按脂肪估算: <strong>${fmt(Math.abs(weightModel.deficit), 0)} ÷ 7700 ≈ ${fmt(Math.abs(weightModel.pureFat), 3)}kg脂肪</strong>。</p>
      <p>更现实的拆分估算:</p>
      ${table(["组成", "今日理论变化", "解释"], componentRows)}
      <h3>明天体重可能变化</h3>
      ${table(["情况", "可能秤重变化"], tomorrowRows)}
    `,
  );
}

function renderFinalSection(totals) {
  const weightModel = buildDailyWeightModel(totals, selectedDate);
  const fatChangeText = formatSignedWeightRange(weightModel.fatRange, 0, "g", 1000);
  const scaleText = formatSignedWeightRange(weightModel.totalRange, 2);
  const glycogenReminder =
    weightModel.priorLowCarbDays >= 2
      ? "最近已经连续低碳，糖原结合水后续下降空间会逐步收窄"
      : "如果刚开始低碳，前两天更容易出现糖原和水分带来的秤重波动";
  const calorieText =
    totals.kcal < profile.calMin
      ? "热量偏低"
      : totals.kcal > profile.calMax
        ? "热量偏高"
        : "热量在目标内";
  const proteinText = totals.protein >= profile.proteinMin ? "蛋白质够" : "蛋白质还要补";
  const carbText = totals.carbs < profile.carbMin ? "碳水偏低" : "碳水可接受";

  return section(
    "最终判断",
    `<p class="final-call">今天${calorieText}，${proteinText}，${carbText}；脂肪变约${fatChangeText}。明天总体重更可能变化 ${scaleText}，${glycogenReminder}，所以秤上的变化不等于纯脂肪变化。</p>`,
  );
}

function buildComparisonRows(totals) {
  return [
    exactComparison("热量 vs 基础代谢", totals.kcal, "kcal", profile.bmr, "基础代谢", 0, true),
    rangeComparison("热量目标", totals.kcal, "kcal", profile.calMin, profile.calMax),
    rangeComparison("蛋白质", totals.protein, "g", profile.proteinMin, profile.proteinMax, "很好"),
    rangeComparison("碳水", totals.carbs, "g", profile.carbMin, profile.carbMax),
    rangeComparison("脂肪", totals.fat, "g", profile.fatMin, profile.fatMax, "合适"),
    rangeComparison("膳食纤维", totals.fiber, "g", profile.fiberMin, profile.fiberMax),
    exactComparison("钙", totals.calcium, "mg", profile.calciumTarget, `约${profile.calciumTarget}mg`),
    exactComparison("钾", totals.potassium, "mg", profile.potassiumTarget, `约${profile.potassiumTarget}mg`),
    maxComparison("钠", totals.sodium, "mg", profile.sodiumMax, `<${profile.sodiumMax}mg`),
    exactComparison("镁", totals.magnesium, "mg", profile.magnesiumTarget, `男性约${profile.magnesiumTarget}mg`),
    exactComparison("铁", totals.iron, "mg", profile.ironTarget, `男性约${profile.ironTarget}mg`, 0.1),
    exactComparison("维生素C", totals.vitaminC, "mg", profile.vitaminCTarget, `男性约${profile.vitaminCTarget}mg`, 0.1),
    exactComparison("维生素D", totals.vitaminD, "μg", profile.vitaminDTarget, `约${profile.vitaminDTarget}μg`, 0.1),
    maxComparison("胆固醇", totals.cholesterol, "mg", profile.cholesterolMax, `约${profile.cholesterolMax}mg以内`),
  ];
}

function rangeComparison(label, value, unit, min, max, goodText = "达标") {
  const precision = unit === "kcal" ? 0 : 1;
  if (value >= min && value <= max) {
    return {
      label,
      intake: valueWithUnit(value, unit),
      target: `${fmt(min, 0)}-${fmt(max, 0)}${unit}`,
      diff: "达标",
      judgement: goodText,
      className: "judgement-good",
    };
  }

  if (value < min) {
    return {
      label,
      intake: valueWithUnit(value, unit),
      target: `${fmt(min, 0)}-${fmt(max, 0)}${unit}`,
      diff: formatSignedRange(value - max, value - min, precision, unit),
      judgement: value < min * 0.75 ? "明显不足" : "偏低",
      className: value < min * 0.75 ? "judgement-bad" : "judgement-warn",
    };
  }

  return {
    label,
    intake: valueWithUnit(value, unit),
    target: `${fmt(min, 0)}-${fmt(max, 0)}${unit}`,
    diff: `+${fmt(value - max, precision)}${unit}`,
    judgement: "偏高",
    className: "judgement-warn",
  };
}

function exactComparison(label, value, unit, target, targetText, precision = 0, isBmr = false) {
  const diff = value - target;
  const close = Math.abs(diff) <= target * 0.08;
  let judgement = close ? "接近目标" : diff > 0 ? "高于" : "不足";
  let className = close ? "judgement-good" : "judgement-warn";

  if (isBmr && diff < -300) {
    judgement = "明显偏低";
    className = "judgement-bad";
  }

  if (!isBmr && diff >= 0) {
    judgement = "达标";
    className = "judgement-good";
  }

  return {
    label,
    intake: valueWithUnit(value, unit, precision),
    target: typeof targetText === "string" ? targetText : valueWithUnit(target, unit),
    diff: close ? "接近" : `${diff >= 0 ? "+" : "-"}${fmt(Math.abs(diff), precision)}${unit}`,
    judgement,
    className,
  };
}

function maxComparison(label, value, unit, max, targetText) {
  const over = value > max;
  return {
    label,
    intake: valueWithUnit(value, unit),
    target: targetText,
    diff: over ? `+${fmt(value - max, 0)}${unit}` : "达标",
    judgement: over ? "偏高" : "达标",
    className: over ? "judgement-warn" : "judgement-good",
  };
}

function buildEvaluation(totals) {
  const items = [];

  if (totals.protein >= profile.proteinMin) {
    items.push({
      title: "蛋白质达标。",
      body: `全天约${fmt(totals.protein, 1)}g蛋白质，对当前减脂保肌目标是合适的。`,
    });
  } else {
    items.push({
      title: "蛋白质不足。",
      body: `全天约${fmt(totals.protein, 1)}g，距离下限还差约${fmt(profile.proteinMin - totals.protein, 1)}g。`,
    });
  }

  if (totals.fat >= profile.fatMin && totals.fat <= profile.fatMax) {
    items.push({
      title: "脂肪合适。",
      body: `约${fmt(totals.fat, 1)}g脂肪，处在目标范围内，坚果、鸡蛋和鱼肉贡献了主要脂肪来源。`,
    });
  } else if (totals.fat < profile.fatMin) {
    items.push({
      title: "脂肪偏低。",
      body: `约${fmt(totals.fat, 1)}g，低于目标下限；可以用鸡蛋、鱼肉、坚果或橄榄油小幅补足。`,
    });
  } else {
    items.push({
      title: "脂肪偏高。",
      body: `约${fmt(totals.fat, 1)}g，高于目标上限；优先检查坚果、油脂和高脂肉类的份量。`,
    });
  }

  if (totals.sodium <= profile.sodiumMax) {
    items.push({
      title: "钠这次不高。",
      body: `约${fmt(totals.sodium, 0)}mg，低于${profile.sodiumMax}mg上限；第二天水分波动的压力较小。`,
    });
  } else {
    items.push({
      title: "钠偏高。",
      body: `约${fmt(totals.sodium, 0)}mg，超过建议上限；酱卤、罐头、加工食品需要重点留意。`,
    });
  }

  const problems = [];
  if (totals.kcal < profile.bmr - 300) {
    problems.push({
      title: "热量偏低。",
      body: `${fmt(totals.kcal, 0)} kcal 低于基础代谢约${fmt(profile.bmr - totals.kcal, 0)} kcal，短期可以，长期天天如此会更难坚持。`,
    });
  } else if (totals.kcal < profile.calMin) {
    problems.push({
      title: "热量略低。",
      body: `距离减脂目标下限还差约${fmt(profile.calMin - totals.kcal, 0)} kcal。`,
    });
  } else if (totals.kcal > profile.calMax) {
    problems.push({
      title: "热量偏高。",
      body: `比目标上限高约${fmt(totals.kcal - profile.calMax, 0)} kcal，下一餐可以减少油脂或主食份量。`,
    });
  }

  if (totals.carbs < profile.carbMin) {
    problems.push({
      title: "碳水偏低。",
      body: `只有约${fmt(totals.carbs, 1)}g，如果当天力量训练，可能影响训练表现和恢复。`,
    });
  }

  if (totals.fiber < profile.fiberMin) {
    problems.push({
      title: "纤维明显不足。",
      body: `只有约${fmt(totals.fiber, 1)}g，离${profile.fiberMin}g下限还有差距。`,
    });
  }

  problems.slice(0, 4).forEach((problem) => items.push(problem));

  const tips = [];
  if (totals.fiber < profile.fiberMin) tips.push("加300g西兰花/绿叶菜，或加30g燕麦");
  if (totals.carbs < profile.carbMin) tips.push("训练日补半根香蕉、100g红薯或一小碗米饭");
  if (totals.kcal < profile.calMin) tips.push("用酸奶、豆腐、鱼肉或少量坚果补150-250 kcal");

  items.push({
    title: "最优微调:",
    body: tips.length ? tips.join("；") + "。" : "今天结构已经比较稳，明天继续保持记录即可。",
  });

  return items;
}

function sodiumWaterText(sodium) {
  return `约 ${formatSignedWeightRange(estimateSodiumWaterRange(sodium), 2)}`;
}

function renderUnmatched(unmatched) {
  if (!unmatched.length) {
    els.unmatchedBox.classList.add("hidden");
    els.unmatchedBox.innerHTML = "";
    return;
  }

  const items = unmatched.map((item) => `<strong>${escapeHtml(item)}</strong>`).join("、");
  els.unmatchedBox.innerHTML = `食物库未匹配: ${items}`;
  els.unmatchedBox.classList.remove("hidden");
}

function normalizeProfile(rawProfile) {
  const source = { ...DEFAULT_PROFILE, ...(rawProfile || {}) };
  if (!source.targetWeight) {
    source.targetWeight = Math.max(20, Number(source.weight || DEFAULT_PROFILE.weight) * 0.9);
  }
  return generateTargets(source);
}

function generateTargets(source) {
  const age = clamp(Number(source.age || DEFAULT_PROFILE.age), 10, 100);
  const sex = source.sex === "female" ? "female" : "male";
  const weight = clamp(Number(source.weight || DEFAULT_PROFILE.weight), 20, 250);
  const targetWeight = clamp(Number(source.targetWeight || Math.max(20, weight * 0.9)), 20, 250);
  const processType = PROCESS_TYPES[source.processType] ? source.processType : DEFAULT_PROFILE.processType;
  const process = PROCESS_TYPES[processType];
  const referenceWeight = targetWeight < weight ? targetWeight : weight;
  const bmr = roundTo(estimateBmr(age, sex, weight), 5);
  const tdeeRest = roundTo(bmr * 1.2, 5);
  const tdeeLight = roundTo(bmr * 1.375, 5);
  const isWeightLoss = targetWeight < weight - 0.2 && processType !== "maintain";
  const calorieFloor = Math.max(sex === "female" ? 1200 : 1400, bmr * process.minBmrFactor);

  let calMin;
  let calMax;

  if (isWeightLoss) {
    calMin = Math.max(tdeeRest * (1 - process.deficitMax), calorieFloor);
    calMax = Math.max(tdeeRest * (1 - process.deficitMin), calMin + 100);
  } else {
    calMin = tdeeRest * 0.95;
    calMax = tdeeRest * 1.05;
  }

  calMin = roundTo(calMin, 10);
  calMax = roundTo(calMax, 10);

  const proteinMin = roundTo(referenceWeight * process.proteinMin, 5);
  const proteinMax = roundTo(referenceWeight * process.proteinMax, 5);
  const fatMin = roundTo(referenceWeight * process.fatMin, 5);
  const fatMax = roundTo(referenceWeight * process.fatMax, 5);
  let carbMin = (calMin - proteinMax * 4 - fatMax * 9) / 4;
  let carbMax = (calMax - proteinMin * 4 - fatMin * 9) / 4;
  carbMin = roundTo(Math.max(process.carbFloor, carbMin), 5);
  carbMax = roundTo(Math.max(carbMin + 30, carbMax), 5);

  const fiberBase = sex === "female" ? 25 : 30;
  const calciumTarget = sex === "female" && age >= 50 ? 1200 : 1000;
  const potassiumTarget = sex === "female" ? 2600 : 3400;
  const magnesiumTarget = sex === "female" ? 320 : 420;
  const ironTarget = sex === "female" && age < 50 ? 18 : 8;
  const vitaminCTarget = sex === "female" ? 75 : 90;

  return {
    age,
    sex,
    weight,
    targetWeight,
    processType,
    weightCalibratedAt: source.weightCalibratedAt || null,
    bmr,
    tdeeRest,
    tdeeLight,
    calMin,
    calMax,
    proteinMin,
    proteinMax,
    carbMin,
    carbMax,
    fatMin,
    fatMax,
    fiberMin: fiberBase,
    fiberMax: fiberBase + 10,
    calciumTarget,
    potassiumTarget,
    sodiumMax: 2300,
    magnesiumTarget,
    ironTarget,
    vitaminCTarget,
    vitaminDTarget: 15,
    cholesterolMax: 300,
  };
}

function estimateBmr(age, sex, weight) {
  if (sex === "female") {
    if (age < 30) return 14.818 * weight + 486.6;
    if (age < 60) return 8.126 * weight + 845.6;
    return 9.082 * weight + 658.5;
  }

  if (age < 30) return 15.057 * weight + 692.2;
  if (age < 60) return 11.472 * weight + 873.1;
  return 11.711 * weight + 587.7;
}

function readProfileForm() {
  return {
    age: Number(profileInputs.age.value || DEFAULT_PROFILE.age),
    sex: profileInputs.sex.value,
    weight: Number(profileInputs.weight.value || DEFAULT_PROFILE.weight),
    targetWeight: Number(profileInputs.targetWeight.value || DEFAULT_PROFILE.targetWeight),
    processType: profileInputs.processType.value,
  };
}

function attachWeightCalibration(profileForm) {
  const previousWeight = Number(profile.weight);
  const nextWeight = Number(profileForm.weight);
  const weightChanged = Number.isFinite(previousWeight) && Number.isFinite(nextWeight) && Math.abs(previousWeight - nextWeight) >= 0.05;
  return {
    ...profileForm,
    weightCalibratedAt: weightChanged ? selectedDate || todayIso() : profile.weightCalibratedAt || null,
  };
}

function renderTargetPreview() {
  const previewProfile = generateTargets(readProfileForm());
  const process = PROCESS_TYPES[previewProfile.processType] || PROCESS_TYPES.muscle_loss;
  els.targetPreview.innerHTML = [
    targetPreviewCard("热量", `${fmt(previewProfile.calMin, 0)}-${fmt(previewProfile.calMax, 0)} kcal/天`),
    targetPreviewCard("蛋白质", `${fmt(previewProfile.proteinMin, 0)}-${fmt(previewProfile.proteinMax, 0)}g/天`),
    targetPreviewCard("碳水", `${fmt(previewProfile.carbMin, 0)}-${fmt(previewProfile.carbMax, 0)}g/天`),
    targetPreviewCard("脂肪", `${fmt(previewProfile.fatMin, 0)}-${fmt(previewProfile.fatMax, 0)}g/天`),
    targetPreviewCard("膳食纤维", `${fmt(previewProfile.fiberMin, 0)}-${fmt(previewProfile.fiberMax, 0)}g/天`),
    targetPreviewCard("估算消耗", `BMR ${fmt(previewProfile.bmr, 0)} / TDEE ${fmt(previewProfile.tdeeRest, 0)}`),
  ].join("");

  if (els.targetPreview.lastElementChild) {
    els.targetPreview.lastElementChild.title = process.note;
  }
}

function targetPreviewCard(label, value) {
  return `<div class="target-preview-card"><span>${label}</span><strong>${value}</strong></div>`;
}

function syncProfileInputs() {
  Object.entries(profileInputs).forEach(([key, input]) => {
    input.value = profile[key];
  });
}

function saveProfile() {
  const profileForm = readProfileForm();
  const previousWeight = Number(profile.weight);
  const nextWeight = Number(profileForm.weight);
  const weightCalibrated = Number.isFinite(previousWeight) && Number.isFinite(nextWeight) && Math.abs(previousWeight - nextWeight) >= 0.05;
  profile = generateTargets(attachWeightCalibration(profileForm));
  storeJson(STORAGE_KEYS.profile, profile);
  syncProfileInputs();
  renderTargetPreview();
  updateReport();

  if (els.dietText.value.trim()) {
    saveCurrent(true);
  }

  renderStatsAndHistory();
  showProfileSavedNotice(weightCalibrated ? "当前体重已校准，并已按新目标刷新当天评估" : "目标已保存，并已按新目标刷新当天评估");
  setSaveStatus(weightCalibrated ? "体重已校准" : "目标已保存");
}

function resetProfile() {
  profile = normalizeProfile(DEFAULT_PROFILE);
  storeJson(STORAGE_KEYS.profile, profile);
  syncProfileInputs();
  renderTargetPreview();
  updateReport();
  renderStatsAndHistory();
  showProfileSavedNotice("已恢复默认目标");
  setSaveStatus("目标已恢复");
}

function showProfileSavedNotice(message) {
  els.profileSavedNotice.textContent = message;
  els.saveProfileBtn.classList.add("just-saved");
  const originalText = "生成并保存目标";
  els.saveProfileBtn.textContent = "已保存";

  window.clearTimeout(showProfileSavedNotice.timer);
  showProfileSavedNotice.timer = window.setTimeout(() => {
    els.profileSavedNotice.textContent = "";
    els.saveProfileBtn.textContent = originalText;
    els.saveProfileBtn.classList.remove("just-saved");
  }, 2200);
}

function copyPreviousDay() {
  const previousDate = Object.keys(records)
    .filter((date) => date < selectedDate)
    .sort()
    .pop();

  if (!previousDate) {
    setSaveStatus("没有上一天");
    return;
  }

  copyRecordToSelectedDate(previousDate);
}

function copyRecordToSelectedDate(sourceDate) {
  const source = records[sourceDate];
  if (!source) {
    setSaveStatus("没有可复制记录");
    return;
  }

  els.dietText.value = source.rawText || "";
  if (els.dailyWeight) els.dailyWeight.value = source.weight || "";
  if (els.waterStatus) els.waterStatus.value = normalizeWaterStatus(source.waterStatus);
  updateReport();
  setSaveStatus(`已复制 ${sourceDate}，待AI解读并保存`);
}

function clearCurrentDay() {
  els.dietText.value = "";
  if (els.dailyWeight) els.dailyWeight.value = "";
  if (els.waterStatus) els.waterStatus.value = "normal";
  clearAiAuditResult();
  clearAiImages();
  renderAiAnswer("");
  updateReport();
  saveCurrent(true);
}

function copyAiInput() {
  const text = els.dietText.value.trim();
  if (!text) {
    setSaveStatus("输入为空");
    return;
  }
  writeClipboard(text, () => setSaveStatus("输入已复制"));
}

function handleAiImageInput(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
  addAiImageFiles(files, "上传");
  event.target.value = "";
}

function handleAiCameraInput(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
  addAiImageFiles(files, "拍照");
  event.target.value = "";
}

function handleEditorPaste(event) {
  const files = extractImageFilesFromClipboard(event.clipboardData);
  if (!files.length) return;
  event.preventDefault();
  addAiImageFiles(files, "粘贴");
}

function handleEditorDragEnter(event) {
  if (!hasDraggedImages(event)) return;
  event.preventDefault();
  els.editorPanel.classList.add("drag-over");
}

function handleEditorDragOver(event) {
  if (!hasDraggedImages(event)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  els.editorPanel.classList.add("drag-over");
}

function handleEditorDragLeave(event) {
  if (els.editorPanel.contains(event.relatedTarget)) return;
  els.editorPanel.classList.remove("drag-over");
}

function handleEditorDrop(event) {
  if (!hasDraggedImages(event)) return;
  event.preventDefault();
  els.editorPanel.classList.remove("drag-over");
  const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith("image/"));
  addAiImageFiles(files, "拖拽");
}

function extractImageFilesFromClipboard(clipboardData) {
  const items = Array.from(clipboardData?.items || []);
  const files = items
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);

  return files.length ? files : Array.from(clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
}

function hasDraggedImages(event) {
  const types = Array.from(event.dataTransfer?.types || []);
  const files = Array.from(event.dataTransfer?.files || []);
  return types.includes("Files") && (!files.length || files.some((file) => file.type.startsWith("image/")));
}

function addAiImageFiles(files, sourceLabel) {
  const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) {
    setAiInputStatus("没有识别到图片文件", true);
    return;
  }

  Promise.all(imageFiles.map(readImageFile))
    .then((images) => {
      const availableSlots = Math.max(0, 6 - aiInputImages.length);
      const accepted = images.slice(0, availableSlots);
      aiInputImages = [...aiInputImages, ...accepted];
      renderImagePreviews();
      const skipped = images.length - accepted.length;
      setAiInputStatus(`${sourceLabel}加入${accepted.length}张图片${skipped > 0 ? `，已达6张上限` : ""}`);
    })
    .catch(() => setAiInputStatus("图片读取失败", true));
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  if (!aiInputImages.length) {
    els.imagePreviewList.innerHTML = "";
    return;
  }

  els.imagePreviewList.innerHTML = aiInputImages
    .map(
      (image, index) => `
        <div class="image-preview">
          <div class="image-preview-frame">
            <img src="${image.dataUrl}" alt="${escapeHtml(image.name)}">
            <button class="image-remove" data-image-index="${index}" type="button" title="移除这张图片" aria-label="移除${escapeHtml(image.name)}">×</button>
          </div>
          <span>${escapeHtml(image.name)}</span>
        </div>
      `,
    )
    .join("");
}

function handleImagePreviewClick(event) {
  const button = event.target.closest("[data-image-index]");
  if (!button) return;
  const index = Number(button.dataset.imageIndex);
  if (!Number.isInteger(index) || index < 0 || index >= aiInputImages.length) return;
  aiInputImages.splice(index, 1);
  renderImagePreviews();
  setAiInputStatus(aiInputImages.length ? `已附加${aiInputImages.length}张图片` : "图片已移除");
}

function clearAiImages() {
  aiInputImages = [];
  renderImagePreviews();
  setAiInputStatus("可结合文字添加餐食、菜单或营养图片。");
}

function setAiInputStatus(message, isError = false) {
  els.aiInputStatus.textContent = message;
  els.aiInputStatus.style.color = isError ? "var(--red)" : "var(--muted)";
}

async function runUnifiedAiInterpretation() {
  aiSettings = normalizeAiSettings(readAiSettingsForm());
  storeJson(STORAGE_KEYS.aiSettings, aiSettings);
  syncAiSettingsInputs();

  const inputText = els.dietText.value.trim();
  if (!inputText && !aiInputImages.length) {
    setAiInputStatus("请输入文字或上传图片", true);
    return;
  }

  if (!aiSettings.apiKey) {
    setAiInputStatus("请先在右侧AI补数据里填写API Key", true);
    return;
  }

  setAiBusy(true, "AI正在解读输入...");
  setAiInputStatus("AI正在解读输入...");

  try {
    const cacheKey = getAiInterpretCacheKey(inputText, aiInputImages);
    let result = getCachedAiInterpretation(cacheKey);
    if (result) {
      setAiInputStatus("使用上次稳定解读结果...");
    } else {
      result = await fetchAiInterpretationData(inputText, aiInputImages, aiSettings);
    }
    result = stabilizeUnifiedAiResult(result, inputText);
    setCachedAiInterpretation(cacheKey, result);
    if (result.normalizedDietText) {
      const normalizedContextDate = result.recordDate || selectedDate;
      setCachedAiInterpretation(getAiInterpretCacheKey(result.normalizedDietText, [], normalizedContextDate), {
        ...result,
        recordDate: "",
      });
    }
    const outcome = applyUnifiedAiResult(result);
    setAiInputStatus(
      outcome.savedDate
        ? `AI已解读并保存至 ${outcome.savedDate}${outcome.replacedExisting ? "（已更新原记录）" : ""}`
        : "AI已完成解读",
    );
  } catch (error) {
    const message = error?.message || "AI解读失败";
    setAiInputStatus(message, true);
    setSaveStatus("AI解读失败");
  } finally {
    setAiBusy(false);
  }
}

async function fetchAiInterpretationData(inputText, images, settings) {
  const prompt = buildUnifiedAiPrompt(inputText, images);
  const imageDataUrls = images.map((image) => image.dataUrl);
  const baseUrl = normalizeBaseUrl(settings.baseUrl || DEFAULT_AI_SETTINGS.baseUrl);
  const isChatApi = settings.apiType === "chat";
  const requestBody = isChatApi
    ? buildChatCompletionsRequestBody(prompt, settings, imageDataUrls, "unified")
    : buildUnifiedOpenAiRequestBody(prompt, settings, imageDataUrls);
  const url = isChatApi ? `${baseUrl}/chat/completions` : `${baseUrl}/responses`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildAiRequestHeaders(settings),
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`AI请求失败: ${detail}`);
  }

  return isChatApi ? extractAiJsonFromChatCompletion(payload) : extractAiJsonFromResponse(payload);
}

function queueAiReportAudit(delay = 700) {
  window.clearTimeout(autoAuditTimer);
  autoAuditTimer = window.setTimeout(() => {
    runAiReportAudit({ automatic: true });
  }, delay);
}

async function runAiReportAudit(options = {}) {
  const isAutomatic = Boolean(options.automatic);
  const runId = ++aiAuditRunId;
  window.clearTimeout(autoAuditTimer);
  aiSettings = normalizeAiSettings(readAiSettingsForm());
  storeJson(STORAGE_KEYS.aiSettings, aiSettings);
  syncAiSettingsInputs();

  const inputText = els.dietText.value.trim();
  if (!inputText) {
    if (!isAutomatic) renderAiAuditMessage("请先输入或生成当天饮食记录。", true);
    return;
  }

  if (!aiSettings.apiKey) {
    if (isAutomatic) {
      renderAiAuditMessage("AI审核待配置：请先在右侧AI补数据里填写API Key。", true);
    } else {
      renderAiAuditMessage("请先在右侧AI补数据里填写API Key。", true);
    }
    return;
  }

  updateReport();
  if (isAutomatic) {
    setAiConfigStatus("AI正在审核报告...");
  } else {
    setAiBusy(true, "AI正在审核报告...");
  }
  renderAiAuditMessage("AI正在审核本地计算结果...");

  try {
    const parsed = lastParsed || parseDietText(inputText, foodLibrary);
    const auditPayload = buildAiAuditPayload(parsed);
    const auditResult = await fetchAiAuditData(auditPayload, aiSettings);
    if (runId !== aiAuditRunId) return;
    renderAiAuditResult(normalizeAiAuditResult(auditResult));
    setSaveStatus("AI审核完成");
  } catch (error) {
    if (runId !== aiAuditRunId) return;
    const message = error?.message || "AI审核失败";
    renderAiAuditMessage(message, true);
    setSaveStatus("AI审核失败");
  } finally {
    if (!isAutomatic && runId === aiAuditRunId) setAiBusy(false);
  }
}

async function fetchAiAuditData(auditPayload, settings) {
  const prompt = buildAiAuditPrompt(auditPayload);
  const baseUrl = normalizeBaseUrl(settings.baseUrl || DEFAULT_AI_SETTINGS.baseUrl);
  const isChatApi = settings.apiType === "chat";
  const requestBody = isChatApi ? buildChatCompletionsRequestBody(prompt, settings, [], "audit") : buildAuditOpenAiRequestBody(prompt, settings);
  const url = isChatApi ? `${baseUrl}/chat/completions` : `${baseUrl}/responses`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildAiRequestHeaders(settings),
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`AI审核请求失败: ${detail}`);
  }

  return isChatApi ? extractAiJsonFromChatCompletion(payload) : extractAiJsonFromResponse(payload);
}

function rangeForAudit(range, multiplier = 1) {
  return {
    min: Number((range.min * multiplier).toFixed(3)),
    max: Number((range.max * multiplier).toFixed(3)),
  };
}

function buildAiAuditPayload(parsed) {
  const totals = parsed.totals;
  const weightModel = buildDailyWeightModel(totals, selectedDate);
  const theoreticalWeight = estimateTheoreticalWeight(totals, selectedDate);
  const macroKcal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
  const recordList = Object.values(records)
    .filter((record) => record.rawText)
    .sort((a, b) => a.date.localeCompare(b.date));
  const cumulativeModel = buildCumulativeWeightModel(recordList);

  return {
    date: selectedDate,
    profile: {
      age: profile.age,
      sex: profile.sex,
      weightKg: profile.weight,
      targetWeightKg: profile.targetWeight,
      processType: profile.processType,
      weightCalibratedAt: profile.weightCalibratedAt || null,
      bmrKcal: profile.bmr,
      tdeeRestKcal: profile.tdeeRest,
      targets: {
        kcal: [profile.calMin, profile.calMax],
        proteinG: [profile.proteinMin, profile.proteinMax],
        carbsG: [profile.carbMin, profile.carbMax],
        fatG: [profile.fatMin, profile.fatMax],
        fiberG: [profile.fiberMin, profile.fiberMax],
        sodiumMaxMg: profile.sodiumMax,
      },
    },
    localReport: {
      totals,
      meals: parsed.meals.map((meal) => ({
        name: meal.name,
        totals: meal.totals,
        itemCount: meal.items.length,
        unmatchedItems: meal.items.filter((item) => !item.matched).map((item) => item.name),
      })),
      comparisonRows: buildComparisonRows(totals).map((row) => ({
        label: row.label,
        intake: row.intake,
        target: row.target,
        diff: row.diff,
        judgement: row.judgement,
      })),
      weightModel: {
        deficitKcal: Number(weightModel.deficit.toFixed(1)),
        pureFatKg: Number(weightModel.pureFat.toFixed(4)),
        pureFatEquivalentKg: Number(weightModel.pureFatEquivalentKg.toFixed(4)),
        priorLowCarbDays: weightModel.priorLowCarbDays,
        fatKg: rangeForAudit(weightModel.fatRange),
        muscleKg: rangeForAudit(weightModel.muscleRange),
        glycogenKg: rangeForAudit(weightModel.glycogenRange),
        glycogenWaterKg: rangeForAudit(weightModel.waterRange),
        sodiumWaterKg: rangeForAudit(weightModel.sodiumWaterRange),
        manualWaterStatus: weightModel.waterStatus,
        manualWaterKg: rangeForAudit(weightModel.manualWaterRange),
        gutContentKg: rangeForAudit(weightModel.gutRange),
        totalWeightKg: rangeForAudit(weightModel.totalRange),
      },
      theoreticalWeight: {
        baseLabel: theoreticalWeight.baseLabel,
        calibrationMode: theoreticalWeight.calibrationMode,
        rangeKg: rangeForAudit(theoreticalWeight.range),
      },
      cumulativeSinceCalibration: {
        fatG: rangeForAudit(cumulativeModel.fatRange, 1000),
        muscleG: rangeForAudit(cumulativeModel.muscleRange, 1000),
        glycogenWaterRawKg: rangeForAudit(cumulativeModel.glycogenWaterRawRange),
        glycogenWaterCappedKg: rangeForAudit(cumulativeModel.glycogenWaterRange),
        latestTransientKg: rangeForAudit(cumulativeModel.transientRange),
        totalWeightKg: rangeForAudit(cumulativeModel.totalRange),
        modelNote: "累计总体=累计脂肪+累计肌肉+封顶后的糖原结合水+最近一天钠/肠道短期项；糖原结合水不会按同样幅度每天无限累加。",
      },
      macroEnergyCheck: {
        macroKcal: Number(macroKcal.toFixed(1)),
        kcalDiff: Number((macroKcal - totals.kcal).toFixed(1)),
        kcalDiffPct: totals.kcal ? Number((((macroKcal - totals.kcal) / totals.kcal) * 100).toFixed(1)) : null,
        tolerancePct: 5,
      },
    },
    modelRules: {
      comparisonDiff: "负数区间按从小到大显示，例如 -574到-444kcal。",
      fatChange: "fatKg 是脂肪变，用负值表示减少；pureFatEquivalentKg 仅表示久坐缺口对应的纯脂肪等价正值。",
      glycogenWaterCumulativeCapKg: [CUMULATIVE_GLYCOGEN_WATER_MIN_KG, CUMULATIVE_GLYCOGEN_WATER_MAX_KG],
      transientWeight: "钠相关水分、手动水分状态和肠道内容物只作为最近一天短期体重项，不做长期线性累计；钠未超标时，钠相关水分不提供正向上限；只有手动水分状态为 retention 时，额外水分才提供正向上限。",
      calibration: "手动修改基础目标里的当前体重即视为当天体重校准；无校准时理论体重只按设置体重估算。",
    },
    auditRules: [
      "AI只审核和指出疑点，不要直接覆盖本地结果。",
      "优先检查数学符号、单位、区间方向、脂肪变是否用负值表示减少。",
      "重点检查糖原和糖原结合水是否遵守累计封顶，不应连续多日线性放大。",
      "宏量营养素热量交叉校验允许约5%以内的食物库和四舍五入误差。",
      "如果只是模型不确定或区间很宽，标记为需注意；只有明显矛盾或算术错误才标记疑似错误。",
    ],
  };
}

function buildAiAuditPrompt(auditPayload) {
  return `你是饮食报告计算审核员。请审核下面这份由本地规则生成的营养和体重报告。

要求：
1. 不要重新自由创作报告，只审核本地计算结果是否有明显错误、矛盾或需要注意的地方。
2. 重点检查单位、正负号、区间方向、久坐缺口换算脂肪、蛋白质不足时肌肉变、糖原结合水是否连续过度累计、钠和水分方向是否矛盾。
3. 已知规则：糖原结合水累计已有封顶，钠相关水分、手动水分状态和肠道内容物只按最近一天短期项处理；钠未超标时，钠相关水分不提供正向上限；只有手动水分状态为 retention 时，额外水分才提供正向上限；宏量营养热量交叉校验允许约5%以内误差。
4. 如果发现问题，给出建议参考值或修正规则；但不要声称已经替用户修改。
5. 只返回 JSON，不要 Markdown，不要解释性前后缀。

返回格式：
{
  "status": "通过/需注意/疑似错误",
  "summary": "一句话总结审核结果",
  "findings": [
    {
      "severity": "info/warning/error",
      "area": "问题所在模块",
      "localValue": "本地显示或计算值",
      "issue": "为什么可能有问题",
      "suggestion": "建议怎么处理",
      "suggestedValue": "可选，建议参考值或为空"
    }
  ],
  "recommendedAction": "仅提示/建议复核规则/建议修正食物营养/建议人工确认"
}

本地报告数据：
${JSON.stringify(auditPayload, null, 2)}`;
}

function buildUnifiedAiPrompt(inputText, images = []) {
  const knownFoods = buildKnownFoodPromptList();
  const recentContext = buildRecentRecordPromptContext();
  const priorLowCarbDays = countPriorLowCarbStreak(selectedDate);
  const localDateHint = detectLocalRecordDate(inputText, todayIso());
  const imageContext = images.length
    ? images.map((image, index) => `图${index + 1}：${image.name || "未命名图片"}`).join("\n")
    : "无图片";
  return `你是我的饮食记录和营养分析助手。请解读用户输入的文字和/或图片。

你要完成：
1. 如果用户输入的是饮食内容、食物照片、包装营养成分表、菜单或购物小票，请整理成 normalizedDietText，格式必须适合本工具解析：
早餐:
1 食物名，数量单位

午餐:
1 食物名，数量单位

晚餐:
1 食物名，数量单位

加餐:
1 食物名，数量单位

2. 图片不只用于营养成分表，必须根据图片类型完整处理：
   - 菜单、称重屏、结算清单或小票：OCR 识别每个菜名和对应克数；价格不是食物重量，不计入营养。
   - 实物餐盘或食物照片：识别所有可见食物，结合碗、盘、餐具等比例保守估计实际可食用量；看不清的项目不要编造，在 answer 中指出需要确认的内容。
   - 包装营养成分表：优先采用图片上能清楚读出的精确数值和每份/每100g基准。
3. 必须把用户文字和图片合并理解。“如图”表示图片里的食物属于文字指定的那一餐；用户明确写出的菜名、数量、吃法和实际食用情况优先于图片默认判断。图片中列出的食物除非用户说明没吃，否则都要记录，不能只挑一部分。
4. 对实际吃法作营养修正：涮汤/过水不能把油脂和钠归零，只能保守降低表面附着的油和盐；去皮、吐皮、去骨或剩下没吃的部分不计入可食量；“全瘦”按瘦肉估算。此类修正必须使用可区分的食物名，例如“涮汤双椒肉丝”“去皮涮汤照烧鸡排”“涮汤全瘦叉烧”，并在 foods 中新增同名营养数据，不能套用未修正的普通菜品。
5. 图片有明确菜品克数时，normalizedDietText 保留修正后的实际可食克数；foods 的 serving 优先使用 100g，nutrition 填该修正菜品每100g营养，系统会按实际克数缩放。图片没有可靠克数时才按常见份量估算，并在 note 或 answer 里写明估算依据和不确定性。
6. 如果用户是在问问题，请在 answer 中直接回答。
7. 如果识别出本工具可能没有的新食物、包装食品、图片里的食物，给出 foods 营养数据估算。dataSource 写“AI估算”，confidence 为 high/medium/low，note 写明熟重/可食部、烹饪和涮汤去皮等假设。
8. 稳定性规则：相同输入和相同图片要给出相同 normalizedDietText；不要随意改食物名；优先使用“已知食物库”的名称，但用户提供了包装营养值、明确品类差异或特殊吃法时例外。
9. 已知食物库里已有的食物，不要在 foods 里重复估算营养；foods 只放未知食物或包装/图片里需要新增的数据。注意：如果用户输入的是更具体的品牌/品类/配方，例如低脂牛奶、高钙牛奶、脱脂牛奶、某品牌牛奶，即使库里已有“牛奶/全脂牛奶”，也要把这个具体名称当作新食物补充 foods。
10. 如果用户给出了任何食物的包装营养差异，例如“蛋白3.6g/100ml”“每100g热量250kcal”“脂肪10g/100g”，不要归并到已知食物，也不要只回答“略有差异”。必须在 normalizedDietText 使用可区分的新名称，例如“牛奶蛋白3.6g每100ml，200ml”或“面包热量250kcal每100g，100g”，并在 foods 中新增同名食物。serving 用对应的 100ml 或 100g，nutrition 至少填入用户给出的营养值，其余营养按包装或合理估算填写。如果你无法判断是否同一种食物，在 answer 中提示需要确认，但不要擅自合并到旧食物。
11. 只返回 JSON，不要 Markdown，不要解释性前后缀。
12. 如果你需要回答“今天会瘦多少”“明天体重会怎么变”“最近为什么掉得快或不掉”等体重变化问题，必须把糖原和糖原结合水当作有限的短期波动来源，不能默认它们每天都能继续按同样幅度下降。若最近几天碳水已连续偏低，后续糖原和结合水的下降幅度要明显收窄；同时要一起考虑脂肪、钠、水分、肠道内容物和训练恢复。
13. 用户可以把记录日期写在整段三餐的开头或结尾，例如“昨天”“前天”“上周三”“2026年6月25日”“6月25号”。请将明确或可合理判断的日期换算成 YYYY-MM-DD，填入 recordDate，并从 normalizedDietText 中删除日期说明。相对日期必须以“系统今天”为基准；如果用户没有指定日期，recordDate 必须返回空字符串，不要自行猜测。

系统今天：${todayIso()}
当前页面日期：${selectedDate}
本地日期初步识别：${localDateHint || "未识别，由你判断是否存在模糊日期表达"}
附加图片：
${imageContext}
当前目标：热量 ${profile.calMin}-${profile.calMax} kcal；蛋白质 ${profile.proteinMin}-${profile.proteinMax}g；碳水 ${profile.carbMin}-${profile.carbMax}g；脂肪 ${profile.fatMin}-${profile.fatMax}g；钠 <${profile.sodiumMax}mg。
到昨天为止的连续低碳天数：${priorLowCarbDays} 天。
最近已保存记录：
${recentContext}
已知食物库：
${knownFoods}

返回格式：
{
  "answer": "给用户看的简明回答，可以为空",
  "recordDate": "用户指定的记录日期，格式为YYYY-MM-DD；没有指定就为空字符串",
  "normalizedDietText": "整理后的三餐文本；如果没有饮食记录内容就为空字符串",
  "foods": [
    {
      "name": "食物名",
      "category": "主食/肉鱼/蔬果/乳制品/坚果/蛋类/补剂/豆制品/自定义",
      "serving": { "qty": 1, "unit": "份" },
      "nutrition": {
        "kcal": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fiber": 0,
        "calcium": 0,
        "potassium": 0,
        "sodium": 0,
        "magnesium": 0,
        "iron": 0,
        "vitaminC": 0,
        "vitaminD": 0,
        "cholesterol": 0
      },
      "dataSource": "AI估算",
      "confidence": "medium",
      "note": "估算依据和假设"
    }
  ]
}

用户输入：
${inputText || "用户只上传了图片，请根据图片回答或整理饮食记录。"}`;
}

function buildKnownFoodPromptList() {
  return foodLibrary
    .filter((food) => !food.needsNutrition)
    .slice(0, 120)
    .map((food) => {
      const n = food.nutrients || {};
      return `- ${food.name}：${defaultServingText(food)}，${fmt(n.kcal, 0)}kcal，蛋白${fmt(n.protein, 1)}g，碳水${fmt(n.carbs, 1)}g，脂肪${fmt(n.fat, 1)}g`;
    })
    .join("\n");
}

function applyUnifiedAiResult(result) {
  const answer = String(result?.answer || "").trim();
  renderAiAnswer(answer);

  const foods = Array.isArray(result?.foods) ? result.foods : [];
  const changedIds = upsertAiFoodItems(foods, true, false);
  if (changedIds.length) {
    storeJson(STORAGE_KEYS.foods, foodLibrary);
  }

  const normalizedDietText = String(result?.normalizedDietText || "").trim();
  const targetDate = normalizeRecordDate(result?.recordDate) || selectedDate;
  const targetRecord = records[targetDate];
  const dateChanged = targetDate !== selectedDate;
  let savedDate = "";
  let replacedExisting = false;
  if (normalizedDietText) {
    selectedDate = targetDate;
    if (els.recordDate) els.recordDate.value = selectedDate;
    if (dateChanged) {
      if (els.dailyWeight) els.dailyWeight.value = targetRecord?.weight || "";
      if (els.waterStatus) els.waterStatus.value = normalizeWaterStatus(targetRecord?.waterStatus);
    }
    els.dietText.value = normalizedDietText;
    updateReport();
    replacedExisting = Boolean(targetRecord?.rawText);
    saveCurrent(false);
    savedDate = selectedDate;
  } else if (changedIds.length) {
    recalculateRecordsForFoodIds(changedIds);
    updateReport();
    renderStatsAndHistory();
    renderQuickFoods();
  }

  if (!normalizedDietText && !answer && !changedIds.length) {
    renderAiAnswer("AI没有返回可用内容。你可以换一种说法，或把图片拍得更清楚一点。");
  }

  return { savedDate, replacedExisting };
}

function stabilizeUnifiedAiResult(result, originalText) {
  const localRecordDate = detectLocalRecordDate(originalText, todayIso());
  const stable = {
    answer: String(result?.answer || "").trim(),
    recordDate: localRecordDate || normalizeRecordDate(result?.recordDate) || "",
    normalizedDietText: String(result?.normalizedDietText || "").trim(),
    foods: Array.isArray(result?.foods) ? result.foods : [],
  };

  const originalParsed = parseDietText(originalText || "", foodLibrary);
  const originalItemCount = originalParsed.meals.reduce((sum, meal) => sum + meal.items.length, 0);
  const normalizedParsed = parseDietText(stable.normalizedDietText || "", foodLibrary);
  const normalizedItemCount = normalizedParsed.meals.reduce((sum, meal) => sum + meal.items.length, 0);

  if (!normalizedItemCount && originalItemCount) {
    stable.normalizedDietText = originalText;
  }

  if (hasExplicitPackagedNutritionVariant(originalText) && normalizedTextUsesConflictingKnownFood(originalText, stable.normalizedDietText)) {
    stable.normalizedDietText = originalText;
  }

  stable.normalizedDietText = stripRecordDateCueFromText(stable.normalizedDietText);

  stable.foods = stable.foods
    .map((item) => ({
      ...item,
      name: sanitizeFoodName(item.name),
      category: sanitizeFoodName(item.category) || "自定义",
      nutrition: completeNutrients(item.nutrition || item.nutrients || {}),
      dataSource: sanitizeFoodName(item.dataSource) || "AI估算",
      confidence: ["high", "medium", "low"].includes(item.confidence) ? item.confidence : "medium",
      note: String(item.note || item.sourceNote || "").trim(),
    }))
    .filter((item) => item.name);

  return stable;
}

function renderAiAnswer(answer) {
  if (!answer) {
    els.aiAnswerBox.classList.add("hidden");
    els.aiAnswerBox.textContent = "";
    return;
  }

  els.aiAnswerBox.textContent = answer;
  els.aiAnswerBox.classList.remove("hidden");
}

function normalizeAiAuditResult(result) {
  const allowedStatuses = ["通过", "需注意", "疑似错误"];
  const status = allowedStatuses.includes(result?.status) ? result.status : "需注意";
  const findings = Array.isArray(result?.findings) ? result.findings : [];

  return {
    status,
    summary: String(result?.summary || "AI已完成审核，但没有返回摘要。").trim(),
    recommendedAction: String(result?.recommendedAction || "仅提示").trim(),
    findings: findings.slice(0, 6).map((finding) => ({
      severity: ["info", "warning", "error"].includes(finding?.severity) ? finding.severity : "warning",
      area: String(finding?.area || "未指明模块").trim(),
      localValue: String(finding?.localValue || "").trim(),
      issue: String(finding?.issue || "未说明原因").trim(),
      suggestion: String(finding?.suggestion || "建议人工复核").trim(),
      suggestedValue: String(finding?.suggestedValue || "").trim(),
    })),
  };
}

function renderAiAuditMessage(message, isError = false) {
  els.aiAuditBox.className = `ai-audit-box ${isError ? "audit-error" : "audit-loading"}`;
  els.aiAuditBox.textContent = message;
  els.aiAuditBox.classList.remove("hidden");
}

function clearAiAuditResult() {
  if (!els.aiAuditBox) return;
  window.clearTimeout(autoAuditTimer);
  aiAuditRunId += 1;
  els.aiAuditBox.classList.add("hidden");
  els.aiAuditBox.innerHTML = "";
}

function renderAiAuditResult(audit) {
  const statusClass =
    audit.status === "通过" ? "audit-pass" : audit.status === "疑似错误" ? "audit-error" : "audit-warning";
  const findingsHtml = audit.findings.length
    ? audit.findings
        .map(
          (finding) => `
            <li class="audit-finding ${escapeHtml(finding.severity)}">
              <strong>${escapeHtml(finding.area)}</strong>
              ${finding.localValue ? `<span>本地值: ${escapeHtml(finding.localValue)}</span>` : ""}
              <p>${escapeHtml(finding.issue)}</p>
              <em>${escapeHtml(finding.suggestion)}${finding.suggestedValue ? ` 参考: ${escapeHtml(finding.suggestedValue)}` : ""}</em>
            </li>
          `,
        )
        .join("")
    : `<li class="audit-finding info"><strong>未发现明显问题</strong><p>AI没有列出需要处理的疑点。</p></li>`;

  els.aiAuditBox.className = `ai-audit-box ${statusClass}`;
  els.aiAuditBox.innerHTML = `
    <div class="audit-title">
      <strong>AI审核：${escapeHtml(audit.status)}</strong>
      <span>${escapeHtml(audit.recommendedAction)}</span>
    </div>
    <p>${escapeHtml(audit.summary)}</p>
    <ul>${findingsHtml}</ul>
  `;
  els.aiAuditBox.classList.remove("hidden");
}

function getAiInterpretCacheKey(inputText, images, contextDate = selectedDate) {
  const imageSignature = (images || []).map((image) => image.dataUrl).join("|");
  return hashString(["meal-vision-v2", todayIso(), contextDate, inputText || "", imageSignature].join("\n---\n"));
}

function getCachedAiInterpretation(cacheKey) {
  const cache = loadJson(STORAGE_KEYS.aiInterpretCache, {});
  const entry = cache[cacheKey];
  return entry?.result || null;
}

function setCachedAiInterpretation(cacheKey, result) {
  const cache = loadJson(STORAGE_KEYS.aiInterpretCache, {});
  cache[cacheKey] = {
    result,
    updatedAt: new Date().toISOString(),
  };

  const entries = Object.entries(cache).sort((a, b) => (b[1].updatedAt || "").localeCompare(a[1].updatedAt || ""));
  const trimmed = Object.fromEntries(entries.slice(0, 40));
  storeJson(STORAGE_KEYS.aiInterpretCache, trimmed);
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function renderQuickFoods() {
  const foodStats = buildFoodStats();
  const referenceDate = selectedDate || todayIso();
  const search = normalizeText(els.foodSearch.value || "");
  const visibleFoodLibrary = foodLibrary.filter((food) => !hiddenQuickFoodIds.has(food.id));
  const categories = ["全部", "常用", ...Array.from(new Set(visibleFoodLibrary.map((food) => food.category))).sort()];

  if (!categories.includes(selectedCategory)) selectedCategory = "全部";

  els.categoryTabs.innerHTML = categories
    .map(
      (category) =>
        `<button class="${category === selectedCategory ? "active" : ""}" data-category="${escapeHtml(category)}" type="button">${escapeHtml(category)}</button>`,
    )
    .join("");

  els.categoryTabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      renderQuickFoods();
    });
  });

  const foods = visibleFoodLibrary
    .map((food) => {
      const stats = foodStats[food.id] || {};
      const usageCount = stats.count || food.usage || 0;
      const enriched = {
        ...food,
        usage: usageCount,
        usageCount,
        usedDays: stats.days || 0,
        lastEaten: stats.lastDate || null,
        firstEaten: stats.firstDate || null,
      };
      enriched.quickScore = computeQuickFoodScore(enriched, referenceDate);
      enriched.quickMeta = describeFoodMeta(enriched, referenceDate);
      return enriched;
    })
    .filter((food) => {
      const matchesSearch = !search || normalizeText(`${food.name}${(food.aliases || []).join("")}`).includes(search);
      const isFreshNew = food.createdAt && daysBetween(food.createdAt, referenceDate) <= 14;
      const matchesCategory =
        selectedCategory === "全部" ||
        (selectedCategory === "常用" ? food.usage > 0 || isFreshNew : food.category === selectedCategory);
      return matchesSearch && matchesCategory;
    })
    .sort(
      (a, b) =>
        b.quickScore - a.quickScore ||
        b.usageCount - a.usageCount ||
        (b.lastEaten || "").localeCompare(a.lastEaten || "") ||
        a.category.localeCompare(b.category, "zh-Hans-CN") ||
        a.name.localeCompare(b.name, "zh-Hans-CN"),
    )
    .slice(0, 80);

  if (!foods.length) {
    els.quickFoodList.innerHTML = `<div class="report-note">没有匹配食物</div>`;
    return;
  }

  els.quickFoodList.innerHTML = foods
    .map(
      (food) => `
        <div class="food-chip" data-food-id="${escapeHtml(food.id)}">
          <button class="food-chip-main" data-food-id="${escapeHtml(food.id)}" type="button">
            <strong>${escapeHtml(food.name)}</strong>
            <span>${escapeHtml(defaultServingText(food))} · ${food.needsNutrition ? "待补数据" : `${fmt(food.nutrients.kcal, 0)} kcal`}${food.quickMeta ? ` · ${escapeHtml(food.quickMeta)}` : ""}</span>
          </button>
          <button class="food-chip-delete" data-food-id="${escapeHtml(food.id)}" type="button" title="从快捷点选移除" aria-label="从快捷点选移除 ${escapeHtml(food.name)}">×</button>
        </div>
      `,
    )
    .join("");

  els.quickFoodList.querySelectorAll(".food-chip-main").forEach((button) => {
    button.addEventListener("click", () => {
      const food = foodLibrary.find((item) => item.id === button.dataset.foodId);
      if (!food) return;
      appendFoodLine(selectedMeal, food);
    });
  });

  els.quickFoodList.querySelectorAll(".food-chip-delete").forEach((button) => {
    button.addEventListener("click", () => {
      hideQuickFood(button.dataset.foodId);
    });
  });

  renderAiFoodTools(foodStats, referenceDate);
}

function hideQuickFood(foodId) {
  const food = foodLibrary.find((item) => item.id === foodId);
  if (!food) return;
  hiddenQuickFoodIds.add(food.id);
  storeJson(STORAGE_KEYS.hiddenQuickFoods, Array.from(hiddenQuickFoodIds));
  renderQuickFoods();
  setSaveStatus(`已从快捷点选移除 ${food.name}`);
}

function appendFoodLine(mealName, food) {
  const text = els.dietText.value.trimEnd();
  const lines = text ? text.split(/\r?\n/) : [];
  const headerIndex = lines.findIndex((line) => detectMealHeader(line.trim()) === mealName);
  const serving = defaultServingText(food);
  let insertedLine = `${food.name}，${serving}`;

  if (headerIndex === -1) {
    const prefix = lines.length ? "\n\n" : "";
    els.dietText.value = `${text}${prefix}${mealName}:\n1 ${insertedLine}`;
  } else {
    let insertAt = lines.length;
    let count = 0;
    for (let index = headerIndex + 1; index < lines.length; index += 1) {
      if (detectMealHeader(lines[index].trim())) {
        insertAt = index;
        break;
      }
      if (lines[index].trim()) count += 1;
    }
    insertedLine = `${count + 1} ${insertedLine}`;
    lines.splice(insertAt, 0, insertedLine);
    els.dietText.value = lines.join("\n");
  }

  updateReport();
  setSaveStatus("待AI解读并保存");
  els.dietText.focus();
}

function addCustomFood() {
  const name = foodFormInputs.name.value.trim();
  if (!name) {
    setSaveStatus("食物缺少名称");
    return;
  }

  const existingFood = findFoodByName(name);
  const food = {
    id: existingFood?.id || `custom-${Date.now()}`,
    name,
    category: foodFormInputs.category.value.trim() || "自定义",
    qty: Number(foodFormInputs.qty.value || 100),
    unit: foodFormInputs.unit.value,
    aliases: existingFood?.aliases || [],
    custom: true,
    createdAt: selectedDate || todayIso(),
    needsNutrition: false,
    dataSource: "手动录入",
    sourceNote: "",
    confidence: "high",
    usage: 0,
    nutrients: completeNutrients({
      kcal: Number(foodFormInputs.kcal.value || 0),
      protein: Number(foodFormInputs.protein.value || 0),
      carbs: Number(foodFormInputs.carbs.value || 0),
      fat: Number(foodFormInputs.fat.value || 0),
      fiber: Number(foodFormInputs.fiber.value || 0),
    }),
  };

  if (existingFood) {
    Object.assign(existingFood, food, {
      createdAt: existingFood.createdAt || food.createdAt,
      usage: existingFood.usage || 0,
      updatedAt: new Date().toISOString(),
    });
  } else {
    foodLibrary.push(food);
  }
  storeJson(STORAGE_KEYS.foods, foodLibrary);
  recalculateRecordsForFoodIds([food.id]);
  foodFormInputs.name.value = "";
  ["kcal", "protein", "carbs", "fat", "fiber"].forEach((key) => {
    foodFormInputs[key].value = "";
  });
  selectedCategory = food.category;
  renderQuickFoods();
  updateReport();
  setSaveStatus("食物已加入");
}

function buildFoodStats() {
  return Object.values(records).reduce((map, record) => {
    const meals = record.meals || parseDietText(record.rawText || "", foodLibrary).meals;
    meals.forEach((meal) => {
      meal.items.forEach((item) => {
        if (!item.foodId) return;
        if (!map[item.foodId]) {
          map[item.foodId] = {
            count: 0,
            days: 0,
            daySet: new Set(),
            firstDate: record.date,
            lastDate: record.date,
          };
        }
        const stats = map[item.foodId];
        stats.count += 1;
        stats.daySet.add(record.date);
        stats.days = stats.daySet.size;
        if (!stats.firstDate || record.date < stats.firstDate) stats.firstDate = record.date;
        if (!stats.lastDate || record.date > stats.lastDate) stats.lastDate = record.date;
      });
    });
    return map;
  }, {});
}

function computeQuickFoodScore(food, referenceDate) {
  const usageScore = Math.log1p(food.usageCount || 0) * 120 + (food.usedDays || 0) * 22;
  const daysSinceLast = food.lastEaten ? daysBetween(food.lastEaten, referenceDate) : null;
  const recentScore = daysSinceLast === null ? 0 : Math.max(0, 50 - daysSinceLast * 4);
  const daysSinceCreated = food.createdAt ? daysBetween(food.createdAt, referenceDate) : null;
  const newScore = daysSinceCreated !== null && daysSinceCreated <= 14 ? Math.max(0, 42 - daysSinceCreated * 3) : 0;
  const reminderScore =
    daysSinceLast !== null && daysSinceLast >= 14 && (food.usageCount || 0) >= 2
      ? Math.min(38, (daysSinceLast - 13) * 1.4 + Math.log1p(food.usageCount) * 8)
      : 0;
  const needsNutritionPenalty = food.needsNutrition ? -12 : 0;

  return usageScore + recentScore + newScore + reminderScore + needsNutritionPenalty;
}

function describeFoodMeta(food, referenceDate) {
  const parts = [];
  if (food.usageCount > 0) parts.push(`${food.usageCount}次`);
  if (food.lastEaten) {
    const days = daysBetween(food.lastEaten, referenceDate);
    if (days === 0) parts.push("今天吃过");
    else if (days <= 7) parts.push(`${days}天前`);
    else if (days >= 21) parts.push("久未吃");
    else parts.push(food.lastEaten.slice(5));
  } else if (food.createdAt && daysBetween(food.createdAt, referenceDate) <= 14) {
    parts.push("新加");
  }
  if (food.dataSource === "AI估算") parts.push("AI估算");
  if (food.dataSource === "手动录入") parts.push("手动录入");
  return parts.join(" · ");
}

function learnFoodsFromParsed(parsed, date) {
  const existingNames = new Set(foodLibrary.flatMap((food) => [food.name, ...(food.aliases || [])].map(normalizeText)));
  const newFoods = [];

  parsed.meals.forEach((meal) => {
    meal.items.forEach((item) => {
      if (item.foodId) return;
      const name = sanitizeFoodName(item.name);
      const key = normalizeText(name);
      if (!key || existingNames.has(key)) return;
      existingNames.add(key);
      newFoods.push(createLearnedFood(name, item.amountLabel, date));
    });
  });

  if (!newFoods.length) return 0;
  foodLibrary.push(...newFoods);
  return newFoods.length;
}

function createLearnedFood(name, amountLabel, date) {
  const serving = servingFromAmountLabel(amountLabel);
  return {
    id: `learned-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    category: "待补数据",
    qty: serving.qty,
    unit: serving.unit,
    aliases: [],
    custom: true,
    createdAt: date || todayIso(),
    needsNutrition: true,
    dataSource: "待补数据",
    sourceNote: "文本记录自动识别，等待补充营养数据",
    confidence: "unknown",
    usage: 0,
    nutrients: emptyNutrients(),
  };
}

function renderAiFoodTools(foodStats = buildFoodStats(), referenceDate = selectedDate || todayIso()) {
  const pendingFoods = getPendingFoods(foodStats, referenceDate);
  if (!pendingFoods.length) {
    els.aiPendingFoods.innerHTML = `<div class="report-note">暂无待补数据的新食物</div>`;
    return;
  }

  els.aiPendingFoods.innerHTML = pendingFoods
    .slice(0, 8)
    .map(
      (food) => `
        <div class="ai-pending-item">
          <strong>${escapeHtml(food.name)}</strong>
          <span>${escapeHtml(defaultServingText(food))}${food.usageCount ? ` · ${food.usageCount}次` : ""}</span>
        </div>
      `,
    )
    .join("");
}

function syncAiSettingsInputs() {
  els.openaiApiKey.value = aiSettings.apiKey || "";
  els.openaiModel.value = aiSettings.model || DEFAULT_AI_SETTINGS.model;
  els.aiBaseUrl.value = aiSettings.baseUrl || DEFAULT_AI_SETTINGS.baseUrl;
  els.aiApiType.value = aiSettings.apiType || DEFAULT_AI_SETTINGS.apiType;
  els.aiUseWebSearch.checked = aiSettings.useWebSearch !== false;
  setAiConfigStatus(aiSettings.apiKey ? "AI已配置，只保存在本机浏览器" : "图灵接口已预设，请保存API Key");
}

function saveAiSettings() {
  aiSettings = normalizeAiSettings(readAiSettingsForm());
  storeJson(STORAGE_KEYS.aiSettings, aiSettings);
  syncAiSettingsInputs();
  setAiConfigStatus(aiSettings.apiKey ? "AI配置已保存" : "已保存，但缺少API Key");
  setSaveStatus("AI配置已保存");
}

function readAiSettingsForm() {
  return {
    apiKey: els.openaiApiKey.value.trim(),
    model: els.openaiModel.value.trim() || DEFAULT_AI_SETTINGS.model,
    baseUrl: normalizeBaseUrl(els.aiBaseUrl.value.trim() || DEFAULT_AI_SETTINGS.baseUrl),
    apiType: els.aiApiType.value || DEFAULT_AI_SETTINGS.apiType,
    useWebSearch: els.aiUseWebSearch.checked,
  };
}

function useTuringPreset() {
  els.aiBaseUrl.value = TURING_AI_PRESET.baseUrl;
  els.aiApiType.value = TURING_AI_PRESET.apiType;
  els.openaiModel.value = TURING_AI_PRESET.model;
  els.aiUseWebSearch.checked = TURING_AI_PRESET.useWebSearch;
  aiSettings = normalizeAiSettings(readAiSettingsForm());
  storeJson(STORAGE_KEYS.aiSettings, aiSettings);
  syncAiSettingsInputs();
  setAiConfigStatus("已切换为图灵接口，API Key 保持当前输入");
}

function normalizeAiSettings(rawSettings) {
  const settings = { ...DEFAULT_AI_SETTINGS, ...(rawSettings || {}) };
  if (!settings.model || settings.model === "gpt-4.1") {
    settings.model = DEFAULT_AI_SETTINGS.model;
  }
  settings.baseUrl = normalizeBaseUrl(settings.baseUrl || DEFAULT_AI_SETTINGS.baseUrl);
  settings.apiType = settings.apiType === "responses" ? "responses" : "chat";
  settings.useWebSearch = settings.apiType === "responses" ? settings.useWebSearch !== false : false;
  return settings;
}

function setAiConfigStatus(message, isError = false) {
  els.aiConfigStatus.textContent = message;
  els.aiConfigStatus.style.color = isError ? "var(--red)" : "var(--teal-dark)";
}

async function runAiNutritionLookup() {
  aiSettings = normalizeAiSettings(readAiSettingsForm());
  storeJson(STORAGE_KEYS.aiSettings, aiSettings);
  syncAiSettingsInputs();

  const pendingFoods = getPendingFoods();
  if (!pendingFoods.length) {
    setAiConfigStatus("没有待补食物");
    return;
  }

  if (!aiSettings.apiKey) {
    setAiConfigStatus("请先填写OpenAI API Key", true);
    return;
  }

  setAiBusy(true, "AI查询中，可能需要几十秒...");

  try {
    const result = await fetchAiNutritionData(pendingFoods, aiSettings);
    els.aiResultInput.value = JSON.stringify(result, null, 2);
    applyAiNutritionResult();
    setAiConfigStatus("AI结果已应用，请检查估算是否合理");
  } catch (error) {
    const message = error?.message || "AI查询失败";
    setAiConfigStatus(message, true);
    setSaveStatus("AI查询失败");
  } finally {
    setAiBusy(false);
  }
}

function setAiBusy(isBusy, message = "") {
  if (els.interpretAiBtn) els.interpretAiBtn.disabled = isBusy;
  els.runAiLookupBtn.disabled = isBusy;
  els.copyAiPromptBtn.disabled = isBusy;
  els.applyAiResultBtn.disabled = isBusy;
  els.saveAiSettingsBtn.disabled = isBusy;
  if (message) setAiConfigStatus(message);
}

async function fetchAiNutritionData(pendingFoods, settings) {
  const prompt = buildAiLookupPrompt(pendingFoods);
  const baseUrl = normalizeBaseUrl(settings.baseUrl || DEFAULT_AI_SETTINGS.baseUrl);
  const isChatApi = settings.apiType === "chat";
  const requestBody = isChatApi ? buildChatCompletionsRequestBody(prompt, settings) : buildOpenAiRequestBody(prompt, settings);
  const url = isChatApi ? `${baseUrl}/chat/completions` : `${baseUrl}/responses`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildAiRequestHeaders(settings),
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`OpenAI请求失败: ${detail}`);
  }

  return isChatApi ? extractAiJsonFromChatCompletion(payload) : extractAiJsonFromResponse(payload);
}

function buildAiRequestHeaders(settings) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.apiKey}`,
  };
}

function buildChatCompletionsRequestBody(prompt, settings, imageDataUrls = [], mode = "nutrition") {
  const userContent = imageDataUrls.length
    ? [
        { type: "text", text: prompt },
        ...imageDataUrls.map((url) => ({
          type: "image_url",
          image_url: { url },
        })),
      ]
    : prompt;

  return {
    model: settings.model || DEFAULT_AI_SETTINGS.model,
    messages: [
      {
        role: "system",
        content:
          mode === "unified"
            ? "你是饮食记录和营养分析助手。你必须结合用户文字识别餐食照片、菜单称重清单和营养成分表，估算实际可食量及营养，也要识别记录日期。必须只输出 JSON，不要输出 Markdown。涉及体重变化估算时，要对糖原和糖原结合水保持保守，不能假定它们每天都能持续按同样幅度下降。"
            : mode === "audit"
              ? "你是饮食报告计算审核员。你只审核本地规则结果，指出疑点和建议，不要直接覆盖本地数值。必须只输出 JSON，不要输出 Markdown。"
              : "你是营养数据估算助手。你必须谨慎估算食物营养数据，不确定时说明假设。只输出 JSON，不要输出 Markdown。",
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    temperature: 0,
    top_p: 1,
    response_format: { type: "json_object" },
  };
}

function buildOpenAiRequestBody(prompt, settings) {
  const body = {
    model: settings.model || DEFAULT_AI_SETTINGS.model,
    temperature: 0,
    input: [
      {
        role: "system",
        content:
          "你是营养数据估算助手。你必须谨慎估算食物营养数据，不确定时说明假设，并只输出符合 schema 的 JSON。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "nutrition_lookup_result",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["foods"],
          properties: {
            foods: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "category", "serving", "nutrition", "dataSource", "confidence", "note"],
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  serving: {
                    type: "object",
                    additionalProperties: false,
                    required: ["qty", "unit"],
                    properties: {
                      qty: { type: "number" },
                      unit: { type: "string" },
                    },
                  },
                  nutrition: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "kcal",
                      "protein",
                      "carbs",
                      "fat",
                      "fiber",
                      "calcium",
                      "potassium",
                      "sodium",
                      "magnesium",
                      "iron",
                      "vitaminC",
                      "vitaminD",
                      "cholesterol",
                    ],
                    properties: NUTRIENT_KEYS.reduce((properties, key) => {
                      properties[key] = { type: "number" };
                      return properties;
                    }, {}),
                  },
                  dataSource: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  note: { type: "string" },
                },
              },
            },
          },
        },
        strict: true,
      },
    },
  };

  if (settings.useWebSearch) {
    body.tools = [{ type: "web_search_preview" }];
  }

  return body;
}

function buildAuditOpenAiRequestBody(prompt, settings) {
  return {
    model: settings.model || DEFAULT_AI_SETTINGS.model,
    temperature: 0,
    input: [
      {
        role: "system",
        content:
          "你是饮食报告计算审核员。你只审核本地规则结果，指出疑点和建议，不要直接覆盖本地数值。必须只输出符合 schema 的 JSON。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "nutrition_report_audit",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["status", "summary", "findings", "recommendedAction"],
          properties: {
            status: { type: "string", enum: ["通过", "需注意", "疑似错误"] },
            summary: { type: "string" },
            findings: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["severity", "area", "localValue", "issue", "suggestion", "suggestedValue"],
                properties: {
                  severity: { type: "string", enum: ["info", "warning", "error"] },
                  area: { type: "string" },
                  localValue: { type: "string" },
                  issue: { type: "string" },
                  suggestion: { type: "string" },
                  suggestedValue: { type: "string" },
                },
              },
            },
            recommendedAction: { type: "string" },
          },
        },
        strict: true,
      },
    },
  };
}

function buildUnifiedOpenAiRequestBody(prompt, settings, imageDataUrls = []) {
  const userContent = [
    { type: "input_text", text: prompt },
    ...imageDataUrls.map((url) => ({
      type: "input_image",
      image_url: url,
    })),
  ];

  const body = {
    model: settings.model || DEFAULT_AI_SETTINGS.model,
    temperature: 0,
    input: [
      {
        role: "system",
        content:
          "你是饮食记录和营养分析助手。你必须结合用户文字识别餐食照片、菜单称重清单和营养成分表，估算实际可食量及营养，也要识别记录日期。必须只输出符合 schema 的 JSON。涉及体重变化估算时，要对糖原和糖原结合水保持保守，不能假定它们每天都能持续按同样幅度下降。",
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "diet_interpretation_result",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["answer", "recordDate", "normalizedDietText", "foods"],
          properties: {
            answer: { type: "string" },
            recordDate: { type: "string" },
            normalizedDietText: { type: "string" },
            foods: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "category", "serving", "nutrition", "dataSource", "confidence", "note"],
                properties: {
                  name: { type: "string" },
                  category: { type: "string" },
                  serving: {
                    type: "object",
                    additionalProperties: false,
                    required: ["qty", "unit"],
                    properties: {
                      qty: { type: "number" },
                      unit: { type: "string" },
                    },
                  },
                  nutrition: {
                    type: "object",
                    additionalProperties: false,
                    required: NUTRIENT_KEYS,
                    properties: NUTRIENT_KEYS.reduce((properties, key) => {
                      properties[key] = { type: "number" };
                      return properties;
                    }, {}),
                  },
                  dataSource: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  note: { type: "string" },
                },
              },
            },
          },
        },
        strict: true,
      },
    },
  };

  if (settings.useWebSearch) {
    body.tools = [{ type: "web_search_preview" }];
  }

  return body;
}

function extractAiJsonFromResponse(payload) {
  const outputText =
    payload.output_text ||
    (Array.isArray(payload.output)
      ? payload.output
          .flatMap((item) => item.content || [])
          .map((content) => content.text || content.value || "")
          .join("")
      : "");

  if (!outputText) {
    throw new Error("AI没有返回可解析文本");
  }

  return parseAiJson(outputText);
}

function extractAiJsonFromChatCompletion(payload) {
  const outputText = payload?.choices?.[0]?.message?.content || "";
  if (!outputText) {
    throw new Error("AI没有返回可解析文本");
  }

  return parseAiJson(outputText);
}

function getPendingFoods(foodStats = buildFoodStats(), referenceDate = selectedDate || todayIso()) {
  return foodLibrary
    .filter((food) => food.needsNutrition)
    .map((food) => {
      const stats = foodStats[food.id] || {};
      const enriched = {
        ...food,
        usageCount: stats.count || 0,
        usedDays: stats.days || 0,
        lastEaten: stats.lastDate || null,
      };
      enriched.quickScore = computeQuickFoodScore(enriched, referenceDate);
      return enriched;
    })
    .sort((a, b) => b.quickScore - a.quickScore || a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function copyAiLookupPrompt() {
  const pendingFoods = getPendingFoods();
  if (!pendingFoods.length) {
    setSaveStatus("没有待补食物");
    return;
  }

  const prompt = buildAiLookupPrompt(pendingFoods);
  writeClipboard(prompt, () => {
    setSaveStatus("AI查询提示已复制");
  });
}

function buildAiLookupPrompt(pendingFoods) {
  const foodLines = pendingFoods
    .map((food, index) => `${index + 1}. ${food.name}，默认份量：${defaultServingText(food)}`)
    .join("\n");

  return `请帮我估算以下食物的营养数据。不要只依赖某一个固定网站，可以综合常见公开营养数据库、包装营养成分表经验和通用食品营养知识；如果食物名称不够明确，请用保守估算，并在 note 里写明假设。

要求：
1. 返回“默认份量”的营养数据，而不是只返回每 100g。
2. kcal 单位是 kcal；蛋白质、碳水、脂肪、膳食纤维单位是 g；钙、钾、钠、镁、铁、维生素C、胆固醇单位是 mg；维生素D单位是 μg。
3. 只返回 JSON，不要解释文字，不要 Markdown 代码块。
4. confidence 只能是 high、medium、low。
5. dataSource 写“AI估算”，note 写明主要假设，比如熟重/生重、品牌不明、每份克重等。

待查询食物：
${foodLines}

返回格式：
{
  "foods": [
    {
      "name": "食物名，必须和上面一致",
      "category": "主食/肉鱼/蔬果/乳制品/坚果/蛋类/补剂/豆制品/自定义",
      "serving": { "qty": 1, "unit": "份" },
      "nutrition": {
        "kcal": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fiber": 0,
        "calcium": 0,
        "potassium": 0,
        "sodium": 0,
        "magnesium": 0,
        "iron": 0,
        "vitaminC": 0,
        "vitaminD": 0,
        "cholesterol": 0
      },
      "dataSource": "AI估算",
      "confidence": "medium",
      "note": "估算依据和假设"
    }
  ]
}`;
}

function applyAiNutritionResult() {
  const raw = els.aiResultInput.value.trim();
  if (!raw) {
    setSaveStatus("请先粘贴AI结果");
    return;
  }

  let result;
  try {
    result = parseAiJson(raw);
  } catch (error) {
    setSaveStatus("AI结果不是有效JSON");
    return;
  }

  const foods = Array.isArray(result) ? result : result.foods;
  if (!Array.isArray(foods) || !foods.length) {
    setSaveStatus("AI结果里没有foods");
    return;
  }

  const changedIds = [];
  foods.forEach((item) => {
    const name = sanitizeFoodName(item.name);
    if (!name) return;
    const food = findFoodByName(name);
    if (!food) return;

    const serving = normalizeAiServing(item.serving, food);
    food.category = sanitizeFoodName(item.category) || food.category || "自定义";
    food.qty = serving.qty;
    food.unit = serving.unit;
    food.nutrients = completeNutrients(item.nutrition || item.nutrients || {});
    food.needsNutrition = false;
    food.custom = true;
    food.dataSource = sanitizeFoodName(item.dataSource) || "AI估算";
    food.confidence = ["high", "medium", "low"].includes(item.confidence) ? item.confidence : "medium";
    food.sourceNote = String(item.note || item.sourceNote || "").trim();
    food.updatedAt = new Date().toISOString();
    changedIds.push(food.id);
  });

  if (!changedIds.length) {
    setSaveStatus("没有匹配到待补食物");
    return;
  }

  storeJson(STORAGE_KEYS.foods, foodLibrary);
  recalculateRecordsForFoodIds(changedIds);
  updateReport();
  renderStatsAndHistory();
  renderQuickFoods();
  els.aiResultInput.value = "";
  setSaveStatus(`已应用${changedIds.length}个AI营养数据`);
}

function upsertAiFoodItems(items, allowCreate, overwriteExisting = false) {
  const changedIds = [];

  items.forEach((item) => {
    const name = sanitizeFoodName(item.name);
    if (!name) return;

    let food = findFoodByName(name);
    if (!food && allowCreate) {
      const serving = normalizeAiServing(item.serving, { qty: 1, unit: "份" });
      food = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        category: sanitizeFoodName(item.category) || "自定义",
        qty: serving.qty,
        unit: serving.unit,
        aliases: [],
        custom: true,
        createdAt: selectedDate || todayIso(),
        needsNutrition: false,
        dataSource: "AI估算",
        sourceNote: "",
        confidence: "medium",
        usage: 0,
        nutrients: emptyNutrients(),
      };
      foodLibrary.push(food);
    }

    if (!food) return;
    const canUpdate = food.needsNutrition || overwriteExisting || (!food.nutrients?.kcal && food.custom);
    if (!canUpdate) return;

    const serving = normalizeAiServing(item.serving, food);
    food.category = sanitizeFoodName(item.category) || food.category || "自定义";
    food.qty = serving.qty;
    food.unit = serving.unit;
    food.nutrients = completeNutrients(item.nutrition || item.nutrients || {});
    food.needsNutrition = false;
    food.custom = true;
    food.dataSource = sanitizeFoodName(item.dataSource) || "AI估算";
    food.confidence = ["high", "medium", "low"].includes(item.confidence) ? item.confidence : "medium";
    food.sourceNote = String(item.note || item.sourceNote || "").trim();
    food.updatedAt = new Date().toISOString();
    changedIds.push(food.id);
  });

  return changedIds;
}

function parseAiJson(raw) {
  let text = raw.replace(/```json|```/gi, "").trim();
  if (!text.startsWith("{") && !text.startsWith("[")) {
    const objectStart = text.indexOf("{");
    const arrayStart = text.indexOf("[");
    const start = [objectStart, arrayStart].filter((index) => index >= 0).sort((a, b) => a - b)[0];
    if (start !== undefined) text = text.slice(start);
  }
  return JSON.parse(text);
}

function normalizeAiServing(serving, fallbackFood) {
  if (!serving || typeof serving !== "object") {
    return { qty: fallbackFood.qty || 1, unit: fallbackFood.unit || "份" };
  }

  return {
    qty: Number(serving.qty || fallbackFood.qty || 1),
    unit: String(serving.unit || fallbackFood.unit || "份").trim() || "份",
  };
}

function findFoodByName(name) {
  const key = normalizeText(name);
  return foodLibrary.find((food) => normalizeText(food.name) === key || (food.aliases || []).some((alias) => normalizeText(alias) === key));
}

function recalculateRecordsForFoodIds(foodIds) {
  Object.values(records).forEach((record) => {
    const parsed = parseDietText(record.rawText || "", foodLibrary);
    record.totals = parsed.totals;
    record.meals = parsed.meals.map((meal) => ({
      name: meal.name,
      totals: meal.totals,
      items: meal.items.map((item) => ({
        name: item.name,
        foodId: item.foodId,
        amountLabel: item.amountLabel,
        nutrients: item.nutrients,
        matched: item.matched,
      })),
    }));
    record.updatedAt = new Date().toISOString();
  });
  storeJson(STORAGE_KEYS.records, records);
}

function sanitizeFoodName(name) {
  return String(name || "")
    .replace(/^\s*(?:[-*•]|[0-9０-９]+[\s.、)）-]*)\s*/, "")
    .replace(/[，,。；;：:\s]+$/g, "")
    .trim();
}

function servingFromAmountLabel(label) {
  const text = String(label || "");
  const match = text.match(/^(\d+(?:\.\d+)?)(.+)$/);
  if (!match) return { qty: 1, unit: "份" };
  const qty = Number(match[1]);
  const unitText = match[2];
  if (unitText === "克") return { qty, unit: "g" };
  if (unitText === "毫升") return { qty, unit: "ml" };
  return { qty, unit: unitText || "份" };
}

function renderStatsAndHistory() {
  const recordList = Object.values(records)
    .filter((record) => record.rawText)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalsList = recordList.map((record) => record.totals || parseDietText(record.rawText, foodLibrary).totals);
  const dayCount = recordList.length;
  const average = averageTotals(totalsList);
  const targetDays = totalsList.filter(
    (totals) => totals.kcal >= profile.calMin && totals.kcal <= profile.calMax && totals.protein >= profile.proteinMin,
  ).length;
  const weights = recordList.map((record) => getUsableRecordedWeight(record.weight)).filter((weight) => typeof weight === "number");
  const weightChange = weights.length >= 2 ? weights[weights.length - 1] - weights[0] : null;
  const cumulativeModel = buildCumulativeWeightModel(recordList);

  els.statsGrid.innerHTML = [
    statCard("记录天数", `${dayCount}天`),
    statCard("平均热量", dayCount ? `${fmt(average.kcal, 0)} kcal` : "-"),
    statCard("平均蛋白质", dayCount ? `${fmt(average.protein, 1)}g` : "-"),
    statCard("体重变化", weightChange === null ? "-" : `${weightChange >= 0 ? "+" : ""}${fmt(weightChange, 1)}kg`),
    statCard("累计脂肪", dayCount ? formatSignedWeightRange(cumulativeModel.fatRange, 0, "g", 1000) : "-"),
    statCard("累计肌肉", dayCount ? formatSignedWeightRange(cumulativeModel.muscleRange, 0, "g", 1000) : "-"),
    statCard("累计总体", dayCount ? formatSignedWeightRange(cumulativeModel.totalRange, 2) : "-"),
    statCard("达标天数", dayCount ? `${targetDays}/${dayCount}` : "-"),
    statCard("最近记录", dayCount ? recordList[recordList.length - 1].date : "-"),
  ].join("");

  renderTrendBars(recordList);
  renderHistory(recordList.slice().reverse());
}

function renderTodayStats(totals = null) {
  const currentTotals = totals || parseDietText(els.dietText.value || "", foodLibrary).totals;
  const weightModel = buildDailyWeightModel(currentTotals, selectedDate);
  const theoreticalWeight = estimateTheoreticalWeight(currentTotals, selectedDate);
  const rows = [
    targetGapRow("热量目标", currentTotals.kcal, "kcal", profile.calMin, profile.calMax, 0),
    energyDeficitRow(weightModel.deficit),
    targetGapRow("蛋白质", currentTotals.protein, "g", profile.proteinMin, profile.proteinMax, 1),
    targetGapRow("脂肪", currentTotals.fat, "g", profile.fatMin, profile.fatMax, 1),
    targetGapRow("碳水", currentTotals.carbs, "g", profile.carbMin, profile.carbMax, 1),
    targetGapRow("膳食纤维", currentTotals.fiber, "g", profile.fiberMin, profile.fiberMax, 1),
    sodiumGapRow(currentTotals.sodium),
    {
      label: "脂肪变",
      intake: "按今天热量",
      gap: formatSignedWeightRange(weightModel.fatRange, 0, "g", 1000),
      className: weightModel.deficit > 0 ? "ok" : "under",
    },
    {
      label: "肌肉变",
      intake: currentTotals.protein >= profile.proteinMin ? "蛋白质达标" : "蛋白质偏低",
      gap: formatSignedWeightRange(weightModel.muscleRange, 0, "g", 1000),
      className: currentTotals.protein >= profile.proteinMin ? "ok" : "under",
    },
    {
      label: "额外水分",
      intake: WATER_STATUS_OPTIONS[weightModel.waterStatus].label,
      gap: formatWaterWeightRange(weightModel.manualWaterRange),
      className: weightModel.waterStatus === "retention" ? "over" : weightModel.waterStatus === "depleted" ? "under" : "ok",
    },
    {
      label: "总体重",
      intake: "含水分状态/肠道",
      gap: formatSignedWeightRange(weightModel.totalRange, 2),
      className: "ok",
    },
    {
      label: "理论体重",
      intake: theoreticalWeight.calibrationMode === "profile-estimate" ? theoreticalWeight.baseLabel : `基于${theoreticalWeight.baseLabel}`,
      gap: formatAbsoluteWeightRange(theoreticalWeight.range, 1),
      className: "ok",
    },
  ];

  els.todayStats.innerHTML = `
    <h3>当天差值</h3>
    ${rows
      .map(
        (row) => `
          <div class="today-stat-row">
            <strong>${row.label}</strong>
            <span>${row.intake}</span>
            <em class="${row.className}">${row.gap}</em>
          </div>
        `,
      )
      .join("")}
  `;
}

function targetGapRow(label, value, unit, min, max, precision) {
  let gap = "达标";
  let className = "ok";
  if (value < min) {
    gap = formatSignedRange(value - max, value - min, precision, unit);
    className = "under";
  } else if (value > max) {
    gap = `+${fmt(value - max, precision)}${unit}`;
    className = "over";
  }

  return {
    label,
    intake: `${fmt(value, precision)}${unit} / ${fmt(min, precision)}-${fmt(max, precision)}${unit}`,
    gap,
    className,
  };
}

function formatEnergyDeficit(deficit) {
  const safeDeficit = normalizeSignedZero(deficit);
  return `${safeDeficit >= 0 ? "+" : "-"}${fmt(Math.abs(safeDeficit), 0)}kcal`;
}

function energyDeficitRow(deficit) {
  const intakeKcal = profile.tdeeRest - deficit;
  return {
    label: "久坐缺口",
    intake: `${fmt(intakeKcal, 0)}kcal / ${fmt(profile.tdeeRest, 0)}kcal`,
    gap: formatEnergyDeficit(deficit),
    className: deficit >= 0 ? "ok" : "over",
  };
}

function sodiumGapRow(value) {
  const diff = value - profile.sodiumMax;
  return {
    label: "钠",
    intake: `${fmt(value, 0)}mg / <${fmt(profile.sodiumMax, 0)}mg`,
    gap: diff <= 0 ? `-${fmt(Math.abs(diff), 0)}mg` : `+${fmt(diff, 0)}mg`,
    className: diff <= 0 ? "ok" : "over",
  };
}

function averageTotals(list) {
  if (!list.length) return emptyNutrients();
  const sum = list.reduce((result, totals) => addNutrients(result, totals), emptyNutrients());
  return NUTRIENT_KEYS.reduce((result, key) => {
    result[key] = sum[key] / list.length;
    return result;
  }, {});
}

function renderTrendBars(recordList) {
  const recent = recordList.slice(-14);
  if (!recent.length) {
    els.trendBars.innerHTML = `<div class="report-note">暂无趋势</div>`;
    return;
  }

  const maxKcal = Math.max(...recent.map((record) => record.totals?.kcal || 0), profile.calMax, 1);
  els.trendBars.innerHTML = recent
    .map((record) => {
      const kcal = record.totals?.kcal || 0;
      const height = Math.max(8, Math.round((kcal / maxKcal) * 100));
      return `<div class="trend-bar" title="${record.date}: ${fmt(kcal, 0)} kcal" style="--h:${height}%"><span>${record.date.slice(5)}</span></div>`;
    })
    .join("");
}

function renderHistory(recordList) {
  if (!recordList.length) {
    els.historyList.innerHTML = `<div class="report-note">暂无记录</div>`;
    return;
  }

  els.historyList.innerHTML = recordList
    .map((record) => {
      const totals = record.totals || parseDietText(record.rawText, foodLibrary).totals;
      return `
        <div class="history-item ${record.date === selectedDate ? "active" : ""}">
          <button class="history-open" data-date="${record.date}" type="button">
            <strong>${record.date}</strong>
            <span>${fmt(totals.kcal, 0)} kcal · 蛋白质 ${fmt(totals.protein, 1)}g</span>
          </button>
          <button class="history-copy" data-copy-date="${record.date}" type="button" title="复制到当前日期">复制</button>
        </div>
      `;
    })
    .join("");

  els.historyList.querySelectorAll(".history-open").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDate = button.dataset.date;
      loadSelectedRecord();
    });
  });

  els.historyList.querySelectorAll(".history-copy").forEach((button) => {
    button.addEventListener("click", () => {
      copyRecordToSelectedDate(button.dataset.copyDate);
    });
  });
}

function statCard(label, value) {
  return `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`;
}

function exportBackup() {
  const data = {
    exportedAt: new Date().toISOString(),
    profile,
    foodLibrary,
    hiddenQuickFoodIds: Array.from(hiddenQuickFoodIds),
    records,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `营养记录备份-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setSaveStatus("已导出");
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      profile = normalizeProfile(data.profile || {});
      hiddenQuickFoodIds = new Set(data.hiddenQuickFoodIds || []);
      foodLibrary = mergeFoodLibrary(data.foodLibrary || []);
      records = data.records || {};
      storeJson(STORAGE_KEYS.profile, profile);
      storeJson(STORAGE_KEYS.hiddenQuickFoods, Array.from(hiddenQuickFoodIds));
      storeJson(STORAGE_KEYS.foods, foodLibrary);
      storeJson(STORAGE_KEYS.records, records);
      syncProfileInputs();
      loadSelectedRecord();
      renderQuickFoods();
      setSaveStatus("已导入");
    } catch (error) {
      setSaveStatus("导入失败");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function copyReport() {
  const text = els.report.innerText.trim();
  if (!text) {
    setSaveStatus("报告为空");
    return;
  }

  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => setSaveStatus("报告已复制"))
      .catch(copyReportFallback);
  } else {
    copyReportFallback();
  }
}

function copyReportFallback() {
  const text = els.report.innerText.trim();
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  setSaveStatus("报告已复制");
}

function section(title, body) {
  return `<section class="report-section"><h2>${title}</h2>${body}</section>`;
}

function table(headers, rows, totalRowIndex = -1) {
  return `
    <table class="report-table">
      <thead>
        <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map((row, index) => `<tr class="${index === totalRowIndex ? "total-row" : ""}">${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  `;
}

function nutrientText(value, unit, precision) {
  return `${fmt(value, precision)} ${unit}`;
}

function valueWithUnit(value, unit, precision = unit === "kcal" || unit === "mg" ? 0 : 1) {
  return `${fmt(value, precision)}${unit}`;
}

function defaultServingText(food) {
  const qty = fmt(food.qty, food.qty % 1 === 0 ? 0 : 1);
  if (food.unit === "g") return `${qty}克`;
  return `${qty}${food.unit}`;
}

function formatAmountLabel(amount) {
  const qty = fmt(amount.qty, amount.qty % 1 === 0 ? 0 : 1);
  if (amount.unit === "g") return `${qty}克`;
  return `${qty}${amount.unit}`;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[，,。；;：:\s]/g, "")
    .replace(/克/g, "g")
    .replace(/毫升/g, "ml");
}

function fmt(value, precision = 1) {
  const number = Number.isFinite(Number(value)) ? Number(value) : 0;
  return number.toFixed(precision).replace(/\.0$/, "");
}

function numericValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function clamp(value, min, max) {
  const number = Number.isFinite(Number(value)) ? Number(value) : min;
  return Math.min(max, Math.max(min, number));
}

function roundTo(value, step) {
  return Math.round(value / step) * step;
}

function daysBetween(fromDate, toDate) {
  const from = dateToLocalNoon(fromDate);
  const to = dateToLocalNoon(toDate);
  if (!from || !to) return 0;
  return Math.max(0, Math.round((to - from) / 86400000));
}

function dateToLocalNoon(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12);
}

function detectLocalRecordDate(text, referenceDate = todayIso()) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";

  const boundaryLines = lines.length === 1 ? lines : [lines[0], lines[lines.length - 1]];
  for (const line of boundaryLines) {
    const fullDate =
      line.match(
        /^(?:(?:记录日期|日期|记录到|记到|记在|算在|写在)\s*[：:为是]?\s*)?(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*[日号]?/,
      ) ||
      line.match(
        /(?:(?:记录日期|日期|记录到|记到|记在|算在|写在)\s*[：:为是]?\s*)?(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*[日号]?(?:的)?(?:饮食|三餐|记录)?[。.]?$/,
      );
    if (fullDate) {
      const date = makeIsoDate(Number(fullDate[1]), Number(fullDate[2]), Number(fullDate[3]));
      if (date) return date;
    }

    const monthDay =
      line.match(
        /^(?:(?:记录日期|日期|记录到|记到|记在|算在|写在)\s*[：:为是]?\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/,
      ) ||
      line.match(
        /(?:(?:记录日期|日期|记录到|记到|记在|算在|写在)\s*[：:为是]?\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*[日号](?:的)?(?:饮食|三餐|记录)?[。.]?$/,
      );
    if (monthDay) {
      const reference = dateToLocalNoon(referenceDate);
      const date = reference && makeIsoDate(reference.getFullYear(), Number(monthDay[1]), Number(monthDay[2]));
      if (date) return date;
    }

    const relativeMatch = line.match(
      /^(?:(?:记录日期|日期|记录到|记到|记在|算在|写在)\s*[：:为是]?\s*)?(大前天|前天|昨天|昨日|今天|今日|明天|后天)(?=$|[的：:,，\s]|早餐|午餐|晚餐|加餐)/,
    ) || line.match(/(大前天|前天|昨天|昨日|今天|今日|明天|后天)(?:的)?(?:饮食|三餐|记录)?[。.]?$/);
    if (relativeMatch) {
      const offsets = { 大前天: -3, 前天: -2, 昨天: -1, 昨日: -1, 今天: 0, 今日: 0, 明天: 1, 后天: 2 };
      return addDaysIso(referenceDate, offsets[relativeMatch[1]] || 0);
    }
  }

  return "";
}

function stripBoundaryDateCue(line, isFirstLine, isLastLine) {
  let value = String(line || "").trim();
  const dateToken = "(?:20\\d{2}\\s*[年./-]\\s*\\d{1,2}\\s*[月./-]\\s*\\d{1,2}\\s*[日号]?|\\d{1,2}\\s*月\\s*\\d{1,2}\\s*[日号]|大前天|前天|昨天|昨日|今天|今日|明天|后天)";
  const label = "(?:(?:记录日期|日期|记录到|记到|记在|算在|写在)\\s*[：:为是]?\\s*)?";

  if (isFirstLine) {
    value = value.replace(new RegExp(`^${label}${dateToken}(?:的)?(?:饮食|三餐|记录)?[：:,，\\s-]*`), "").trim();
  }
  if (isLastLine) {
    value = value
      .replace(new RegExp(`[，,\\s-]*${label}${dateToken}(?:的)?(?:饮食|三餐|记录)?[。.]?$`), "")
      .trim();
  }
  return value;
}

function stripRecordDateCueFromText(text) {
  const lines = String(text || "").split(/\r?\n/);
  const nonEmptyIndexes = lines.map((line, index) => (line.trim() ? index : -1)).filter((index) => index >= 0);
  if (!nonEmptyIndexes.length) return "";
  const firstIndex = nonEmptyIndexes[0];
  const lastIndex = nonEmptyIndexes[nonEmptyIndexes.length - 1];
  return lines
    .map((line, index) => stripBoundaryDateCue(line, index === firstIndex, index === lastIndex))
    .join("\n")
    .trim();
}

function normalizeRecordDate(value) {
  const match = String(value || "").trim().match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  return match ? makeIsoDate(Number(match[1]), Number(match[2]), Number(match[3])) : "";
}

function makeIsoDate(year, month, day) {
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDaysIso(value, offset) {
  const date = dateToLocalNoon(value);
  if (!date) return "";
  date.setDate(date.getDate() + Number(offset || 0));
  return makeIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" ? number : null;
}

function writeClipboard(text, onSuccess) {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(onSuccess)
      .catch(() => {
        writeClipboardFallback(text);
        onSuccess();
      });
    return;
  }

  writeClipboardFallback(text);
  onSuccess();
}

function writeClipboardFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function todayIso() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function storeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function mergeFoodLibrary(savedFoods) {
  const savedById = new Map((Array.isArray(savedFoods) ? savedFoods : []).map((food) => [food.id, food]));
  const mergedDefaults = DEFAULT_FOODS.map((food) => {
    const saved = savedById.get(food.id);
    return saved
      ? {
          ...food,
          usage: saved.usage || 0,
          createdAt: saved.createdAt || food.createdAt || null,
          needsNutrition: Boolean(saved.needsNutrition),
          dataSource: saved.dataSource || food.dataSource || "内置估算",
          sourceNote: saved.sourceNote || "",
          confidence: saved.confidence || "medium",
          updatedAt: saved.updatedAt || null,
        }
      : food;
  });
  const defaultIds = new Set(DEFAULT_FOODS.map((food) => food.id));
  const customFoods = (Array.isArray(savedFoods) ? savedFoods : [])
    .filter((food) => food.custom && !defaultIds.has(food.id))
    .map((food) => ({
      ...food,
      nutrients: completeNutrients(food.nutrients || {}),
      aliases: food.aliases || [],
      createdAt: food.createdAt || null,
      needsNutrition: Boolean(food.needsNutrition),
      dataSource: food.dataSource || (food.needsNutrition ? "待补数据" : "手动录入"),
      sourceNote: food.sourceNote || "",
      confidence: food.confidence || (food.needsNutrition ? "unknown" : "high"),
      updatedAt: food.updatedAt || null,
      usage: food.usage || 0,
    }));
  return [...mergedDefaults, ...customFoods];
}
