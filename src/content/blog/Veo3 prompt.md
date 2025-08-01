---
title: Veo3 Prompt
description: 盒子瞬间打开的prompt
publishedAt: 2025-07-21
tags:
  - AI
  - prompt
  - Veo3
---

提示词，发给 AI 让他改成你想要的主题就行：

Camera Instruction : Single fixed camera, wide-angle lens, one continuous shot, no camera cuts or movement.

Main Description : The scene begins in a sunny, empty room. In the center sits a cardboard box with a cute cat face drawn on it with a marker. The box wiggles slightly, lets out a soft meow, and then bursts open! Countless yarn balls, scratching post parts, soft cushions, and cat toys gush out. A giant cat tree grows rapidly from the floor like a real tree, complete with leafy platforms; a scratching post wraps itself with sisal rope and stands in a corner; feather wands dance through the air before landing in a toy basket. Once everything is perfectly in place, a fluffy orange cat walks in with elegant steps, curiously observing its new paradise, and finally curls up comfortably on a soft cushion.

Core Elements : Cardboard box with a cat face, large cat tree, scratching posts and pillars, various cat beds and cushions, wall-mounted cat shelves, a window hammock, an automatic water fountain, cat toys (feather wands, jingle balls, toy mice), a rug with a paw-print pattern.

Motion & Atmosphere : Full of playful fun and whimsy, various cat supplies assemble automatically in a lively, charming way, ultimately creating a warm, cozy, and safe paradise built perfectly for a cat.

Keywords : 16:9, one take, no cuts, dynamic assembly, photorealistic, cat, cute, cat room, pet paradise, heartwarming, no text.

摄像说明：单机固定，广角镜头，连续拍摄一张，无镜头切换或移动。

主要描述：场景始于一个阳光明媚的空房间。房间中央放着一个纸箱，纸箱上用马克笔画着一张可爱的猫脸。盒子微微晃动，发出一声轻柔的喵喵声，然后突然爆裂开来！无数的毛线球、猫抓板零件、柔软的坐垫和猫玩具喷涌而出。一棵巨大的猫树像真树一样从地板上迅速生长出来，上面还有茂密的平台；一根猫抓板用剑麻绳缠绕着自己，立在角落里；羽毛棒在空中飞舞，最后落入玩具篮中。当一切准备就绪后，一只毛茸茸的橘猫迈着优雅的步伐走了进来，好奇地观察着它的新天堂，最后舒服地蜷缩在柔软的坐垫上。

核心元素：带有猫脸的纸板箱、大型猫树、猫抓柱和猫柱、各种猫床和猫垫、壁挂式猫架、窗台吊床、自动饮水器、猫玩具（羽毛棒、铃铛球、玩具老鼠）、带有爪印图案的地毯。

动感与氛围：充满嬉戏的乐趣和奇思妙想，各种猫用品以活泼迷人的方式自动组装，最终创造出一个专为猫咪打造的温暖、舒适、安全的天堂。

关键词：16：9、一次拍摄、无剪辑、动态组装、照片般逼真、猫、可爱、猫房、宠物天堂、温馨、无文字。

prompt 一个大的纸箱子上面标着顺丰快递的logo 在一间空的装修好的屋子里自己瞬间打开 填充了家里所有的家居和装饰 像个新家的样子 一镜到底  广告片的风格 最后一还冲进来一条边牧高兴地趴在地上


## 树叶旋转 组成文字

```json
{"sequences":[ { "start_sec":0, "end_sec":3, "narrative":"Wind gusts,whirl '深度放空' in leaves.", "visuals":{ "camera_setup":"Cinematic,55mm,f/1.7", "motion":"Whirl spin", "lighting":"Autumn golden rays", "effects":["Leaf twirls","Gust trails"] }, "environment":{ "setting":"Windy forest glade", "atmosphere":"Rustle leaves,branch sways", "props":["Fallen logs"] }, "entities":[ { "type":"text", "details":"'深度放空' leafy font,brown-green", "behaviors":["Gathers debris","Spins vortex"], "interactions":"Leaves circle" } ], "audio_layers":{ "background":"Wind howl -10dB", "dialogue":[], "effects":["Leaf rustles"] } }, { "start_sec":3, "end_sec":5, "narrative":"Letters settle,flutter with breeze.", "visuals":{ "camera_setup":"Cinematic,55mm,f/1.7", "motion":"Settle down", "lighting":"Soft dappled shade", "effects":["Flutter settle","Dust motes"] }, "environment":{ "setting":"Windy forest glade", "atmosphere":"Rustle leaves,branch sways", "props":["Fallen logs"] }, "entities":[ { "type":"text", "details":"'深度放空' leafy font,brown-green", "behaviors":["Lands firm","Quivers lightly"], "interactions":"Breeze scatters" }}
```

## 岩浆效果

```json
{"sequences":[ { "start_sec":0, "end_sec":3, "narrative":"Lava flows,mold 'VEO3' in magma.", "visuals":{ "camera_setup":"Cinematic,35mm,f/2.8", "motion":"Flow track", "lighting":"Molten red orange", "effects":["Lava bubbles","Heat distort"] }, "environment":{ "setting":"Active volcano crater", "atmosphere":"Ash clouds,rumble quakes", "props":["Rock fissures"] }, "entities":[ { "type":"text", "details":"'VEO3' molten font,red-yellow", "behaviors":["Melts shape","Bubbles surface"], "interactions":"Lava drips" } ], "audio_layers":{ "background":"Rumble lava -10dB", "dialogue":[], "effects":["Bubble bursts"] } }, { "start_sec":3, "end_sec":5, "narrative":"Letters harden,crack with glow.", "visuals":{ "camera_setup":"Cinematic,35mm,f/2.8", "motion":"Cool zoom", "lighting":"Cooling ember fade", "effects":["Crack lines","Smoke wisps"] }, "environment":{ "setting":"Active volcano crater", "atmosphere":"Ash clouds,rumble quakes", "props":["Rock fissures"] }, "entities":[ { "type":"text", "details":"'VEO3' molten font,red-yellow", "behaviors":["Solidifies firm","Pulses heat"], "interactions":"Smoke rises" }}

```

## 威廉古堡风格
```json
{"sequences":[ { "start_sec":0, "end_sec":3, "narrative":"Shadows creep,outline 'VEO3' in dark.", "visuals":{ "camera_setup":"Cinematic,50mm,f/1.8", "motion":"Creep in", "lighting":"Low key moonlight", "effects":["Shadow tendrils","Eerie fade"] }, "environment":{ "setting":"Haunted gothic hall", "atmosphere":"Dust motes,echo whispers", "props":["Candle flickers"] }, "entities":[ { "type":"text", "details":"'VEO3' spooky font,black-purple", "behaviors":["Forms silhouettes","Twists menacing"], "interactions":"Shadows dance" } ], "audio_layers":{ "background":"Ominous drone -11dB", "dialogue":[], "effects":["Creak sounds"] } }, { "start_sec":3, "end_sec":5, "narrative":"Letters manifest,glow with phantom light.", "visuals":{ "camera_setup":"Cinematic,50mm,f/1.8", "motion":"Reveal spin", "lighting":"Ghostly inner shine", "effects":["Phantom auras","Subtle dissipate"] }, "environment":{ "setting":"Haunted gothic hall", "atmosphere":"Dust motes,echo whispers", "props":["Candle flickers"] }, "entities":[ { "type":"text", "details":"'VEO3' spooky font,black-purple", "behaviors":["Solidifies eerie","Pulses haunt"], "interactions":"Light casts shadows" }}
```

## 赛博朋克 霓虹灯
```json
{"sequences":[ { "start_sec":0, "end_sec":3, "narrative":"Neon lights flicker,trace 'VEO3' in glow.", "visuals":{ "camera_setup":"Cinematic,28mm,f/2.0", "motion":"Pulse zoom", "lighting":"Vibrant cyber hues", "effects":["Glow pulses","Circuit traces"] }, "environment":{ "setting":"Futuristic city night", "atmosphere":"Rain slick,holo ads", "props":["Towering billboards"] }, "entities":[ { "type":"text", "details":"'VEO3' cyber font,pink-blue", "behaviors":["Ignites lines","Flickers sync"], "interactions":"Neon reflects" } ], "audio_layers":{ "background":"Synth wave -10dB", "dialogue":[], "effects":["Electric hums"] } }, { "start_sec":3, "end_sec":5, "narrative":"Letters surge,explode with sparks.", "visuals":{ "camera_setup":"Cinematic,28mm,f/2.0", "motion":"Energy burst", "lighting":"Intense flare bursts", "effects":["Spark showers","Halo effects"] }, "environment":{ "setting":"Futuristic city night", "atmosphere":"Rain slick,holo ads", "props":["Towering billboards"] }, "entities":[ { "type":"text", "details":"'VEO3' cyber font,pink-blue", "behaviors":["Expands bright","Crackles power"], "interactions":"Sparks rain" }}
```

## 烟雾效果

```json
{"sequences":[ { "start_sec":0, "end_sec":3, "narrative":"Smoke curls,forge 'VEO3' in haze.", "visuals":{ "camera_setup":"Cinematic,45mm,f/2.1", "motion":"Swirl in", "lighting":"Dim ember underlight", "effects":["Smoke tendrils","Dissipate slow"] }, "environment":{ "setting":"Mystic ritual chamber", "atmosphere":"Incense wafts,shadow plays", "props":["Altar stones"] }, "entities":[ { "type":"text", "details":"'VEO3' smoky font,grey-red", "behaviors":["Coils form","Wafts ethereal"], "interactions":"Smoke envelops" } ], "audio_layers":{ "background":"Low chant -11dB", "dialogue":[], "effects":["Whisper winds"] } }, { "start_sec":3, "end_sec":5, "narrative":"Letters clear,glow with embers.", "visuals":{ "camera_setup":"Cinematic,45mm,f/2.1", "motion":"Reveal push", "lighting":"Inner fire pulse", "effects":["Ember floats","Heat shimmer"] }, "environment":{ "setting":"Mystic ritual chamber", "atmosphere":"Incense wafts,shadow plays", "props":["Altar stones"] }, "entities":[ { "type":"text", "details":"'VEO3' smoky font,grey-red", "behaviors":["Sharpens edges","Flares subtly"], "interactions":"Embers spark" }}
```

## 棱镜彩虹分裂

```json
{"sequences":[ { "start_sec":0, "end_sec":3, "narrative":"Crystals prism,split 'VEO3' in rainbows.", "visuals":{ "camera_setup":"Cinematic,90mm,f/1.5", "motion":"Refract turn", "lighting":"Spectrum color bursts", "effects":["Light rays","Prism flares"] }, "environment":{ "setting":"Crystal cavern glow", "atmosphere":"Echo drips,light dances", "props":["Gem clusters"] }, "entities":[ { "type":"text", "details":"'VEO3' prismatic font,multi-hue", "behaviors":["Splits beams","Shifts colors"], "interactions":"Rays bend" } ], "audio_layers":{ "background":"Harmonic chimes -9dB", "dialogue":[], "effects":["Crystal rings"] } }, { "start_sec":3, "end_sec":5, "narrative":"Letters unify,shine with spectrum.", "visuals":{ "camera_setup":"Cinematic,90mm,f/1.5", "motion":"Unite focus", "lighting":"Unified rainbow glow", "effects":["Color merge","Halo pulses"] }, "environment":{ "setting":"Crystal cavern glow", "atmosphere":"Echo drips,light dances", "props":["Gem clusters"] }, "entities":[ { "type":"text", "details":"'VEO3' prismatic font,multi-hue", "behaviors":["Combines vivid","Radiates bright"], "interactions":"Spectrum swirls" }}
```

## 北极冰雕

```json
{"sequences":[ { "start_sec":0, "end_sec":3, "narrative":"Ice freezes,sculpt 'VEO3' in frost.", "visuals":{ "camera_setup":"Cinematic,50mm,f/1.8", "motion":"Frost spread", "lighting":"Cool arctic blue", "effects":["Crystal growth","Freeze crackle"] }, "environment":{ "setting":"Frozen tundra plain", "atmosphere":"Blizzard flurries,snow drifts", "props":["Icy spikes"] }, "entities":[ { "type":"text", "details":"'VEO3' crystalline font,white-silver", "behaviors":["Forms layers","Glints light"], "interactions":"Frost expands" } ], "audio_layers":{ "background":"Wind chill -12dB", "dialogue":[], "effects":["Ice forms"] } }, { "start_sec":3, "end_sec":5, "narrative":"Letters solidify,shimmer with snow.", "visuals":{ "camera_setup":"Cinematic,50mm,f/1.8", "motion":"Pan glide", "lighting":"Reflective ice shine", "effects":["Snow dust","Subtle melt"] }, "environment":{ "setting":"Frozen tundra plain", "atmosphere":"Blizzard flurries,snow drifts", "props":["Icy spikes"] }, "entities":[ { "type":"text", "details":"'VEO3' crystalline font,white-silver", "behaviors":["Hardens firm","Sparks cold"], "interactions":"Snow settles" }}
```
