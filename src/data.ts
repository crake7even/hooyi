import { Movie, Trailer, ContinueWatching } from "./types";

export const GENRES = [
  "All",
  "动画",
  "冒险",
  "科幻",
  "悬疑",
  "剧情",
  "奇幻",
  "动作"
];

export const LANGUAGES = [
  { code: "All", name: "所有语言" },
  { code: "en", name: "英语" },
  { code: "ja", name: "日语" },
  { code: "ko", name: "韩语" },
  { code: "fr", name: "法语" },
  { code: "de", name: "德语" }
];

export const MOVIES_DATABASE: Movie[] = [
  {
    id: "spider-man-spiderverse",
    title: "蜘蛛侠：纵横宇宙",
    year: 2023,
    genres: ["动画", "冒险", "动作", "奇幻"],
    rating: 8.9,
    duration: "2小时 20分钟",
    director: "乔伊姆·多斯·桑托斯",
    cast: ["沙梅克·摩尔", "海莉·斯坦菲尔德", "奥斯卡·伊萨克", "杰克·约翰逊"],
    synopsis: "迈尔斯·莫拉莱斯穿梭于多元宇宙之间，并在那里遇到了一支职责是保护多元宇宙存亡的“蜘蛛联盟”。但是，当英雄们在如何应对新的威胁上发生冲突时，迈尔斯必须重新定义成为英雄的含义。",
    posterUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-futuristic-subway-station-with-neon-lights-43959-large.mp4", 
    trending: true,
    language: "en",
    maturityRating: "PG",
    likesCount: "42.4万",
    platforms: [
      { name: "Netflix", type: "netflix", priceInfo: "包含在订阅中" },
      { name: "Apple TV", type: "apple", priceInfo: "租赁/购买" },
      { name: "Prime Video", type: "prime", priceInfo: "租赁/购买" }
    ]
  },
  {
    id: "the-flash",
    title: "闪电侠",
    year: 2023,
    genres: ["奇幻", "动作", "冒险", "科幻"],
    rating: 6.7,
    duration: "2小时 24分钟",
    director: "安迪·马希提",
    cast: ["埃兹拉·米勒", "本·阿弗莱克", "迈克尔·基顿", "萨莎·卡列"],
    synopsis: "巴里·艾伦利用他的超能力改变了过去，但他试图拯救家人的举动却改变了未来。他被困在一个佐德将军已经回归的现实中，而且这里没有超级英雄可以求助。",
    posterUrl: "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-neon-light-from-a-tunnel-with-movement-41712-large.mp4", 
    trending: true,
    language: "en",
    maturityRating: "PG-13",
    likesCount: "18.2万",
    platforms: [
      { name: "Max", type: "hbo", priceInfo: "包含在订阅中" },
      { name: "Prime Video", type: "prime", priceInfo: "包含在订阅中" },
      { name: "Apple TV", type: "apple", priceInfo: "租赁/购买" }
    ]
  },
  {
    id: "manifest",
    title: "命运航班",
    year: 2021,
    genres: ["悬疑", "剧情", "科幻"],
    rating: 7.1,
    duration: "45分钟 / 集",
    director: "杰弗里·利柏",
    cast: ["梅丽莎·罗斯伯格", "乔什·达拉斯", "J.R. 拉米雷斯", "卢娜·布莱斯"],
    synopsis: "一架商用客机在失踪五年后离奇重现，乘客们发现世界已经在没有他们的情况下继续前行，并且他们很快开始经历一些奇怪的事情。",
    posterUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-clouds-view-from-inside-an-airplane-cabin-40342-large.mp4", 
    trending: false,
    language: "en",
    maturityRating: "TV-14",
    likesCount: "25.7万",
    platforms: [
      { name: "Netflix", type: "netflix", priceInfo: "免费流媒体" }
    ]
  },
  {
    id: "elemental",
    title: "疯狂元素城",
    year: 2023,
    genres: ["动画", "冒险", "剧情", "奇幻"],
    rating: 7.0,
    duration: "1小时 41分钟",
    director: "彼得·孙",
    cast: ["莉娅·刘易斯", "马莫多·阿西", "罗尼·德尔卡门", "希拉·沃米"],
    synopsis: "在一个火、水、土和空气四族共同生活的城市里，一位火热的年轻女子和一个随波逐流的男人发现了一个基本要素：他们之间究竟有多少共同点。",
    posterUrl: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-animation-style-of-sparks-of-light-on-a-black-background-48866-large.mp4", 
    trending: true,
    language: "en",
    maturityRating: "PG",
    likesCount: "34.1万",
    platforms: [
      { name: "Disney+", type: "disney", priceInfo: "包含在订阅中" },
      { name: "Apple TV", type: "apple", priceInfo: "租赁/购买" }
    ]
  },
  {
    id: "interstellar",
    title: "星际穿越",
    year: 2014,
    genres: ["科幻", "冒险", "剧情"],
    rating: 8.7,
    duration: "2小时 49分钟",
    director: "克里斯托弗·诺兰",
    cast: ["马修·麦康纳", "安妮·海瑟薇", "杰西卡·查斯坦", "迈克尔·凯恩"],
    synopsis: "当地球变得不再适合居住时，一队探险家承载着人类历史上最重要的任务：穿越银河系，去寻找人类未来在星空中的可能性。",
    posterUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-conceptual-energy-portal-with-stars-and-particles-42065-large.mp4", 
    trending: false,
    language: "en",
    maturityRating: "PG-13",
    likesCount: "98.5万",
    platforms: [
      { name: "Prime Video", type: "prime", priceInfo: "包含在订阅中" },
      { name: "Paramount+", type: "paramount", priceInfo: "包含在订阅中" },
      { name: "Apple TV", type: "apple", priceInfo: "租赁/购买" }
    ]
  },
  {
    id: "suzume",
    title: "铃芽之旅",
    year: 2022,
    genres: ["动画", "冒险", "奇幻", "悬疑"],
    rating: 7.7,
    duration: "2小时 2分钟",
    director: "新海诚",
    cast: ["原菜乃华", "松村北斗", "深津绘里", "染谷将太"],
    synopsis: "一个设定在现代的动作冒险公路故事，17岁的少女铃芽帮助一位神秘的年轻人一起关闭一扇扇正向整个日本释放灾难的“往生之门”。",
    posterUrl: "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-sunlight-filtering-through-leaves-42247-large.mp4", 
    trending: true,
    language: "ja",
    maturityRating: "PG",
    likesCount: "51.3万",
    platforms: [
      { name: "Crunchyroll", type: "crunchyroll", priceInfo: "包含在订阅中" },
      { name: "Netflix", type: "netflix", priceInfo: "包含在订阅中" }
    ]
  },
  {
    id: "parasite",
    title: "寄生虫",
    year: 2019,
    genres: ["剧情", "惊悚", "悬疑"],
    rating: 8.5,
    duration: "2小时 12分钟",
    director: "奉俊昊",
    cast: ["宋康昊", "李善均", "赵茹珍", "崔宇植"],
    synopsis: "贪婪和阶级歧视威胁着富有的朴家和贫穷的金家之间新建立的共生关系，最终演变成无法控制的混乱风暴以悲剧收场。",
    posterUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-raindrops-falling-on-a-window-at-night-42646-large.mp4", 
    trending: false,
    language: "ko",
    maturityRating: "R",
    likesCount: "44.9万",
    platforms: [
      { name: "Max", type: "hbo", priceInfo: "包含在订阅中" },
      { name: "Hulu", type: "hulu", priceInfo: "包含在订阅中" },
      { name: "Apple TV", type: "apple", priceInfo: "租赁/购买" }
    ]
  },
  {
    id: "spirited-away",
    title: "千与千寻",
    year: 2001,
    genres: ["动画", "冒险", "奇幻", "剧情"],
    rating: 8.6,
    duration: "2小时 5分钟",
    director: "宫崎骏",
    cast: ["柊瑠美", "入野自由", "夏木麻里", "内藤刚志"],
    synopsis: "在跟随家人搬到郊区的途中，一位名叫千寻的10岁闷闷不乐的女孩误入了一个由神灵、女巫和灵魂统治的世界，在那里，人类会变成怪兽。",
    posterUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-glowing-gold-particles-moving-slowly-31295-large.mp4", 
    trending: false,
    language: "ja",
    maturityRating: "PG",
    likesCount: "87.2万",
    platforms: [
      { name: "Max", type: "hbo", priceInfo: "包含在订阅中" },
      { name: "Apple TV", type: "apple", priceInfo: "租赁/购买" }
    ]
  },
  {
    id: "dark-season-3",
    title: "暗黑",
    year: 2020,
    genres: ["悬疑", "科幻", "剧情"],
    rating: 8.8,
    duration: "1小时 / 集",
    director: "巴伦·博·欧达尔",
    cast: ["路易斯·霍夫曼", "玛雅·舍内", "莉莎·维卡里", "奥利弗·马苏奇"],
    synopsis: "一部带有超自然色彩的家庭传奇剧，故事发生在一个德国小镇，两个年轻孩子的失踪暴露了四个家庭之间的关系，并在穿越时空的几代人之间建立了联系。",
    posterUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-thick-fog-moving-through-forest-trees-42289-large.mp4", 
    trending: true,
    language: "de",
    maturityRating: "TV-MA",
    likesCount: "62.1万",
    platforms: [
      { name: "Netflix", type: "netflix", priceInfo: "包含在订阅中" }
    ]
  },
  {
    id: "the-last-kingdom",
    title: "孤国春秋：七王必须死",
    year: 2023,
    genres: ["动作", "剧情", "冒险"],
    rating: 7.3,
    duration: "1小时 51分钟",
    director: "爱德华·巴瑟杰特",
    cast: ["亚历山大·德雷蒙", "哈利·吉尔比", "马克·罗利", "阿纳斯·费达拉维丘斯"],
    synopsis: "在爱德华国王死后，贝班堡的乌特雷德和他的同志们在一个四分五裂的王国中冒险，希望能最终统一英格兰。",
    posterUrl: "https://images.unsplash.com/photo-1559650656-5d1d361ad10e?w=600&auto=format&fit=crop&q=80", 
    backdropUrl: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=1200&auto=format&fit=crop&q=80", 
    trailerUrl: "https://assets.mixkit.co/videos/preview/mixkit-flying-over-misty-rocky-mountains-in-scandinavia-42841-large.mp4", 
    trending: false,
    language: "en",
    maturityRating: "R",
    likesCount: "21.6万",
    platforms: [
      { name: "Netflix", type: "netflix", priceInfo: "包含在订阅中" }
    ]
  }
];

export const NEW_TRAILERS: Trailer[] = [
  {
    id: "t-last-kingdom",
    title: "孤国春秋：七王必须死",
    movieTitle: "七王必须死",
    thumbnailUrl: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&auto=format&fit=crop&q=80",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-flying-over-misty-rocky-mountains-in-scandinavia-42841-large.mp4",
    duration: "2:30",
    uploadedAt: "今天"
  },
  {
    id: "t-super-mario",
    title: "超级马力欧兄弟大电影 - 最终预告",
    movieTitle: "超级马力欧兄弟大电影",
    thumbnailUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-gaming-setup-with-colorful-led-lights-42410-large.mp4",
    duration: "1:45",
    uploadedAt: "今天"
  },
  {
    id: "t-spider-verse",
    title: "蜘蛛侠：纵横宇宙 - 官方预告",
    movieTitle: "纵横宇宙",
    thumbnailUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&auto=format&fit=crop&q=80",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-futuristic-subway-station-with-neon-lights-43959-large.mp4",
    duration: "2:52",
    uploadedAt: "昨天"
  },
  {
    id: "t-the-flash",
    title: "闪电侠 - 官方预告 2",
    movieTitle: "闪电侠",
    thumbnailUrl: "https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=400&auto=format&fit=crop&q=80",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-neon-light-from-a-tunnel-with-movement-41712-large.mp4",
    duration: "2:15",
    uploadedAt: "3天前"
  }
];

export const CONTINUE_WATCHING_LIST: ContinueWatching[] = [
  {
    id: "dark-s3",
    title: "暗黑",
    episodeInfo: "第 3 季 第 3 集",
    progress: 75,
    thumbnailUrl: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "interstellar",
    title: "星际穿越",
    episodeInfo: "32分12秒",
    progress: 42,
    thumbnailUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "manifest",
    title: "命运航班",
    episodeInfo: "第 2 季 第 2 集",
    progress: 90,
    thumbnailUrl: "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "suzume",
    title: "铃芽之旅",
    episodeInfo: "剩余 1小时45分",
    progress: 55,
    thumbnailUrl: "https://images.unsplash.com/photo-1502472591829-16e8790485d4?w=150&auto=format&fit=crop&q=80"
  }
];
