# 使用 `yt-dlp` 下载在线视频

## 使用方法（Windows 11）

### 前提

安装 Python、ffmpeg、uv、git

### 把仓库克隆到本地

```bash
git https://github.com/sipieng/yt-dlp-dl.git
```

### 使用 uv 创建虚拟环境并安装依赖

```bash
uv sync
```

运行 `uv run yt-dlp --version`，获得版本号即说明安装成功。

此时如果没有其他要求，已经可以通过 `uv run yt-dlp <URL>` 下载在线视频了。

### 使用全局别名（alias）进一步简化操作

1. 在 PowerShell 下运行 `notepad $PROFILE`，如果提示文件不存在或找不到，就按步骤 2 新建一个。

2. 创建 PowerShell Profile（如果不存在的话）：`New-Item -Type File -Path $PROFILE -Force`。
    
    此命令会在 `C:\Users\xxx\Documents` 目录下创建 `WindowsPowerShell` 文件夹，并在其中创建一个 `Microsoft.PowerShell_profile.ps1` 的文本文件。

3. 再次运行 `notepad $PROFILE`，打开配置文件，输入以下内容并保存。
    
    ```powershell
    # 请把 <PROJECT DIR> 替换为项目所在目录

    function dl {
        uv run --project <PROJECT DIR> yt-dlp @args
    }
    ```
    
    以上把 `uv run --project <PROJECT DIR> yt-dlp @args` 命令映射为了全局别名 `dl`。其中 `--project <PROJECT DIR>` 的作用是指定项目的工作目录，从而绕过需要通过 `CD` 命令进入项目目录再运行 `yt-dlp` 的繁琐步骤。
    
    ⚠ 完成后需要**重启 PowerShell**，因为 Profile 文件只在启动时加载一次。
    
    ⚠ 如果 PowerShell 提示 `无法加载文件 C:\Users\xxx\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1，因为在此系统上禁止运行脚本`，则进入“终端管理员”，然后运行 `set-executionpolicy remotesigned` 即可。    

4. 验证

    在全局环境下运行 `dl -- version`。此时应能正常输出版本号。

    ```powershell
    dl --version
    2025.12.08
    ```
    这样设置完之后，在全局环境下直接运行 `dl <URL>` 即可下载视频。

## yt-dlp 的一些用法

视频 URL: `https://m.youtube.com/watch?v=ZEjLaSf4cCA`

### 获取 youtube 视频信息：`yt-dlp <URL> -F / --list-formats`

```powershell
PS C:\Users\xxx> dl -F https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] Extracting URL: https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] ZEjLaSf4cCA: Downloading webpage
WARNING: [youtube] No supported JavaScript runtime could be found. Only deno is enabled by default; to use another runtime add  --js-runtimes RUNTIME[:PATH]  to your command/config. YouTube extraction without a JS runtime has been deprecated, and some formats may be missing. See  https://github.com/yt-dlp/yt-dlp/wiki/EJS  for details on installing one
[youtube] ZEjLaSf4cCA: Downloading android sdkless player API JSON
[youtube] ZEjLaSf4cCA: Downloading web safari player API JSON
WARNING: [youtube] ZEjLaSf4cCA: Some web_safari client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[youtube] ZEjLaSf4cCA: Downloading m3u8 information
WARNING: [youtube] ZEjLaSf4cCA: Some web client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[info] Available formats for ZEjLaSf4cCA:
ID  EXT   RESOLUTION FPS CH │  FILESIZE   TBR PROTO │ VCODEC        VBR ACODEC      ABR ASR MORE INFO
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
sb3 mhtml 48x27        0    │                 mhtml │ images                                storyboard
sb2 mhtml 80x45        1    │                 mhtml │ images                                storyboard
sb1 mhtml 160x90       1    │                 mhtml │ images                                storyboard
sb0 mhtml 320x180      1    │                 mhtml │ images                                storyboard
139 m4a   audio only      2 │   1.35MiB   49k https │ audio only        mp4a.40.5   49k 22k low, m4a_dash
140 m4a   audio only      2 │   3.59MiB  129k https │ audio only        mp4a.40.2  129k 44k medium, m4a_dash
251 webm  audio only      2 │   3.63MiB  131k https │ audio only        opus       131k 48k medium, webm_dash
91  mp4   256x144     24    │ ~ 2.85MiB  103k m3u8  │ avc1.4D400C       mp4a.40.5
160 mp4   256x144     24    │   1.27MiB   46k https │ avc1.4d400c   46k video only          144p, mp4_dash
93  mp4   640x360     24    │ ~10.47MiB  378k m3u8  │ avc1.4D401E       mp4a.40.2
134 mp4   640x360     24    │   5.95MiB  215k https │ avc1.4d401e  215k video only          360p, mp4_dash
18  mp4   640x360     24  2 │  13.48MiB  486k https │ avc1.42001E       mp4a.40.2       44k 360p
95  mp4   1280x720    24    │ ~29.73MiB 1075k m3u8  │ avc1.64001F       mp4a.40.2
136 mp4   1280x720    24    │  23.28MiB  840k https │ avc1.64001f  840k video only          720p, mp4_dash
96  mp4   1920x1080   24    │ ~49.28MiB 1782k m3u8  │ avc1.640028       mp4a.40.2
137 mp4   1920x1080   24    │  38.50MiB 1389k https │ avc1.640028 1389k video only          1080p, mp4_dash
```

### 默认下载最佳视频与音频：`yt-dlp <URL>`

```powershell
PS C:\Users\xxx> dl https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] Extracting URL: https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] ZEjLaSf4cCA: Downloading webpage
WARNING: [youtube] No supported JavaScript runtime could be found. Only deno is enabled by default; to use another runtime add  --js-runtimes RUNTIME[:PATH]  to your command/config. YouTube extraction without a JS runtime has been deprecated, and some formats may be missing. See  https://github.com/yt-dlp/yt-dlp/wiki/EJS  for details on installing one
[youtube] ZEjLaSf4cCA: Downloading android sdkless player API JSON
[youtube] ZEjLaSf4cCA: Downloading web safari player API JSON
WARNING: [youtube] ZEjLaSf4cCA: Some web_safari client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[youtube] ZEjLaSf4cCA: Downloading m3u8 information
WARNING: [youtube] ZEjLaSf4cCA: Some web client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[info] ZEjLaSf4cCA: Downloading 1 format(s): 137+251
[download] Destination: 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f137.mp4
[download] 100% of   38.50MiB in 00:00:07 at 4.99MiB/s
[download] Destination: 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f251.webm
[download] 100% of    3.63MiB in 00:00:01 at 2.77MiB/s
[Merger] Merging formats into "淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].mkv"
Deleting original file 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f251.webm (pass -k to keep)
Deleting original file 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f137.mp4 (pass -k to keep)

# 得到的视频为mkv格式。从上面获取的信息可以看到：
# 最佳视频为：ID: 137 mp4 1920x1080 avc1 video only
# 最佳音频为：ID: 251 webm opus audio only
# yt-dlp 的默认策略是把上面两个最佳音视频合并，即 137+251
# 视频编码是 avc1，但 webm 不能封装 avc1
# 音频编码是 opus，但 mp4 不能封装 opus
# 所以使用了可以同时接受这两种编码的 mkv 进行封装
```

### 只下载某个 ID 的音频或视频：`yt-dlp -f <ID> <URL>`

```powershell
PS C:\Users\xxx> dl -f 140 https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] Extracting URL: https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] ZEjLaSf4cCA: Downloading webpage
WARNING: [youtube] No supported JavaScript runtime could be found. Only deno is enabled by default; to use another runtime add  --js-runtimes RUNTIME[:PATH]  to your command/config. YouTube extraction without a JS runtime has been deprecated, and some formats may be missing. See  https://github.com/yt-dlp/yt-dlp/wiki/EJS  for details on installing one
[youtube] ZEjLaSf4cCA: Downloading android sdkless player API JSON
[youtube] ZEjLaSf4cCA: Downloading web safari player API JSON
WARNING: [youtube] ZEjLaSf4cCA: Some web_safari client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[youtube] ZEjLaSf4cCA: Downloading m3u8 information
WARNING: [youtube] ZEjLaSf4cCA: Some web client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[info] ZEjLaSf4cCA: Downloading 1 format(s): 140
[download] Destination: 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].m4a
[download] 100% of    3.59MiB in 00:00:01 at 2.92MiB/s
[FixupM4a] Correcting container of "淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].m4a"

# 得到了 ID=140 的 m4a 音频文件
```

### 选择指定的视频和音频并封装为受支持的格式：`yt-dlp -f <VIDEO_ID> + <AUDIO_ID> --merge-output-format <FORMAT> <URL>`

```powershell
PS C:\Users\xxx> dl -f 140+134 --merge-output-format mp4 https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] Extracting URL: https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] ZEjLaSf4cCA: Downloading webpage
WARNING: [youtube] No supported JavaScript runtime could be found. Only deno is enabled by default; to use another runtime add  --js-runtimes RUNTIME[:PATH]  to your command/config. YouTube extraction without a JS runtime has been deprecated, and some formats may be missing. See  https://github.com/yt-dlp/yt-dlp/wiki/EJS  for details on installing one
[youtube] ZEjLaSf4cCA: Downloading android sdkless player API JSON
[youtube] ZEjLaSf4cCA: Downloading web safari player API JSON
WARNING: [youtube] ZEjLaSf4cCA: Some web_safari client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[youtube] ZEjLaSf4cCA: Downloading m3u8 information
WARNING: [youtube] ZEjLaSf4cCA: Some web client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[info] ZEjLaSf4cCA: Downloading 1 format(s): 140+134
[download] Destination: 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f140.m4a
[download] 100% of    3.59MiB in 00:00:01 at 2.76MiB/s
[download] Destination: 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f134.mp4
[download] 100% of    5.95MiB in 00:00:02 at 2.41MiB/s
[Merger] Merging formats into "淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].mp4"
Deleting original file 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f140.m4a (pass -k to keep)
Deleting original file 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f134.mp4 (pass -k to keep)
```

### 我只关心“最终是 mp4”，不指定 ID: `yt-dlp -f "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" --merge-output-format mp4 <URL>`

```powershell
PS C:\Users\xxx> dl -f "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] Extracting URL: https://m.youtube.com/watch?v=ZEjLaSf4cCA
[youtube] ZEjLaSf4cCA: Downloading webpage
WARNING: [youtube] No supported JavaScript runtime could be found. Only deno is enabled by default; to use another runtime add  --js-runtimes RUNTIME[:PATH]  to your command/config. YouTube extraction without a JS runtime has been deprecated, and some formats may be missing. See  https://github.com/yt-dlp/yt-dlp/wiki/EJS  for details on installing one
[youtube] ZEjLaSf4cCA: Downloading android sdkless player API JSON
[youtube] ZEjLaSf4cCA: Downloading web safari player API JSON
WARNING: [youtube] ZEjLaSf4cCA: Some web_safari client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[youtube] ZEjLaSf4cCA: Downloading m3u8 information
WARNING: [youtube] ZEjLaSf4cCA: Some web client https formats have been skipped as they are missing a url. YouTube is forcing SABR streaming for this client. See  https://github.com/yt-dlp/yt-dlp/issues/12482  for more details
[info] ZEjLaSf4cCA: Downloading 1 format(s): 137+140
[download] Destination: 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f137.mp4
[download] 100% of   38.50MiB in 00:00:07 at 5.12MiB/s
[download] Destination: 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f140.m4a
[download] 100% of    3.59MiB in 00:00:01 at 2.66MiB/s
[Merger] Merging formats into "淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].mp4"
Deleting original file 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f137.mp4 (pass -k to keep)
Deleting original file 淚海⧸大頭針AI ｜ 原唱：許茹芸｜『你怎麼捨得讓我的淚 流向海付出的感情永遠 找不回來』（動態歌詞🎵) [ZEjLaSf4cCA].f140.m4a (pass -k to keep)

# bv*[ext=mp4] → 最好的 mp4 视频
# ba[ext=m4a]  → mp4 体系的音频
# /b[ext=mp4]  → 斜杠表示回退，如果上面不行，就退回单文件 mp4
# 这是“永远优先 mp4”的写法
```

### 其他

```powershell
# 只要最高质量的音频，不限格式
yt-dlp -f ba <URL>

# 输出到指定目录
yt-dlp -P "C:\Downloads" <URL>

# 只要最高质量的 mp4 视频，不要音频
yt-dlp -f "bv*[ext=mp4]" <URL>

# 指定清晰度（例如 1080p + mp4 格式）
yt-dlp -f "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]" --merge-output-format mp4 <URL>
```