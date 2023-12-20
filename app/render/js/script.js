window.addEventListener("load", function () {
    // - 初期設定
    // 画像移動関連のグローバル変数
    let START_X = 0
    let START_Y = 0
    let DRAG_START_X = 0
    let DRAG_START_Y = 0
    let MOVE_X = 0
    let MOVE_Y = 0
    let CLICK_FLG = 0
    let dx = 0
    let dy = 0
    let zoom = 1

    // 画像データ格納先
    let image_data_dict = {}

    // 初期canvas追加
    let canvas_num = 1
    addCanvas(canvas_num)
    
    // - コマンドライン引数の画像パス取得
    getCmdArgsImage_promise = this.window.api.getCmdArgsImage()
    getCmdArgsImage_promise.then((result, failure) => {
        for (let i = 0; i < result.length; i++) {
            console.log(result[i])
            ResistDictAndDraw(result[i], i)
        }

        canvas_num = result.length
        addCanvas(canvas_num)
    })

    // - ドラッグアンドドロップ動作
    this.document.ondragover = function (e) {
        // console.log("DragOver")
        // ドラッグアンドドロップ関連の動作には、デフォルトの動作が設定されている。
        // そのため、以下の1行を追記することで、そのデフォルトの動作を削除し、自分の意図した動作を行わせることができる
        e.preventDefault()
    }

    this.document.ondrop = function (e) {
        // console.log("Drop")
        e.preventDefault()

        // ファイルパス取得
        const files = e.dataTransfer.files

        // dropされた位置を計算し、listのどこから画像を更新するか判定する
        const CANVAS_X = Math.round(window.innerWidth / canvas_num)
        const update_image_offset = Math.floor(e.pageX / CANVAS_X) // どのcanvasから画像更新するかのoffset

        // ファイルパスをリストに一時格納
        for (let i = 0; i < files.length; i++) {
            // 画像パス設定
            let image_path = files[i].path
            ResistDictAndDraw(image_path, i + update_image_offset)
        }

        // canvas_numが入力された画像よりも小さい場合は、canvasを追加する
        if (canvas_num < files.length + update_image_offset) {
            canvas_num = files.length + update_image_offset
            addCanvas(canvas_num)
            drawCanvas()
        }
    }

    // 辞書に画像データを登録し、描画する (画像パスと何番目に登録するかを引数に入れる)
    function ResistDictAndDraw(image_path, i) {
        // 拡張子を確認し、".bin"ファイルの場合は、一度bmpに変換して出力する
        ext = image_path.split(".").slice(-1)[0]
        if (ext === "bin") {
            // 出力ファイル名作成 (日時を名前にすることで、同名ファイルがドロップされても名前が被らないようにする)
            const now_date = new Date();
            const year     = now_date.getFullYear()
            const month    = String(now_date.getMonth()).padStart(2, "0")
            const day      = String(now_date.getDate()).padStart(2, "0")
            const hour     = String(now_date.getHours()).padStart(2, "0")
            const minutes  = String(now_date.getMinutes()).padStart(2, "0")
            const second   = String(now_date.getSeconds()).padStart(2, "0")
            let out_path   = `tmp/tmp_image_file_${year}${month}${day}_${hour}${minutes}${second}_${i}.bmp`

            // bin --> bmp 変換 (外部pythonスクリプト実行)
            window.api.sendDropFile([image_path, out_path])

            let sleep_cnt = 0
            let id = setInterval(function() {
                // bmpファイルが存在するかを確認
                const existFile_promise = window.api.existFile(out_path)
                existFile_promise.then((result, failres) => { // promise objectの使い方がよくわかっていない
                    // 存在した場合は処理を停止する
                    if (result !== false) {
                        // 一応image_pathを更新しておく
                        out_path = result
                        // 画像読み込み
                        readImageData(out_path, i)
                        // カウント削除
                        clearInterval(id)
                    }

                    // sleep カウントを増やす (時間計測)
                    sleep_cnt++

                    // 10秒経過してもファイルが存在しない場合は処理を中止する (10秒以上たってから画像が生成された場合は、ドラッグなど再描画する処理を行うと表示される)
                    if (sleep_cnt === 100 && result === false) {
                        console.log(`[ERROR] ${out_path} is not found.`)
                        // カウント削除
                        clearInterval(id)
                    }
                })
            }, 100)
        } else {
            // 画像読み込み
            readImageData(image_path, i)
        }
    }

    // - キーボード操作
    // TODO
    // キーボードを押して操作できる機能の追加を行う
    // 表示内容のスクリーンショット
    // canvasを追加して複数画像を同時に表示する
    this.document.addEventListener("keydown", function(e) {
        // 数字ボタンで固定の倍率に変更
        if (Number(e.key) || e.key === "0") {
            // 変更前拡大縮小率取得
            const pre_zoom = zoom

            // 拡大縮小率変更
            zoom = Math.max(Number(e.key), 1) // 0の時も100%になるようにする

            // 倍率が同じだったら拡縮の処理は行わない
            if (pre_zoom !== zoom) {
                // 表示位置中央に拡大縮小するように座標調整
                const CENTER_X = (window.innerWidth  / canvas_num) / 2
                const CENTER_Y = window.innerHeight / 2

                const ImageX = CENTER_X - START_X
                const ImageY = CENTER_Y - START_Y

                const ZoomX = ImageX * (zoom / pre_zoom) // 小数点表示させた方が元画像の倍率が保たれ、差分表示の際に都合が良いためあえてroundなどしない
                const ZoomY = ImageY * (zoom / pre_zoom) // 小数点表示させた方が元画像の倍率が保たれ、差分表示の際に都合が良いためあえてroundなどしない

                const DiffX = ZoomX - ImageX
                const DiffY = ZoomY - ImageY

                START_X = START_X - DiffX
                START_Y = START_Y - DiffY
            }

            // 0が押された場合は、座標を左上に合わせる
            if (e.key === "0") {
                START_X = 0
                START_Y = 0
            }

            drawCanvas()
        }

        if (e.key.match("F[1-9]")) {
            canvas_num = e.key.replace("F", "")
            addCanvas(canvas_num)
        }
    })

    // - ボタン
    // TODO
    // 複数枚表示しているときに、重ね合わせ、差分を表示するボタン

    // - マウス操作
    this.document.onmousedown= function(e) {
        e.preventDefault()
        MOUSE_CLICK_START_X = e.pageX
        MOUSE_CLICK_START_Y = e.pageY
        CLICK_FLG = 1
    }

    this.document.onmouseup = function(e) {
        e.preventDefault()
         START_X = dx
         START_Y = dy

        // マウスドラッグ関連の変数を初期化
        CLICK_FLG = 0
        DRAG_START_X = 0
        DRAG_START_Y = 0
        MOVE_X = 0
        MOVE_Y = 0
    }

    this.document.onmousemove = function(e) {
        e.preventDefault()
        if (CLICK_FLG === 1) {
            const MOUSE_CURRENT_X = e.pageX
            const MOUSE_CURRENT_Y = e.pageY
            MOVE_X = MOUSE_CURRENT_X - MOUSE_CLICK_START_X
            MOVE_Y = MOUSE_CURRENT_Y - MOUSE_CLICK_START_Y
            drawCanvas()
        }
    }

    this.document.onwheel = function(e) {
        // 拡大縮小の上限加減
        const MAX_ZOOM = 50
        const MIN_ZOOM = 0.1

        // 拡大縮小の選択
        let zoom_ratio = 0
        if (e.deltaY < 0) {
            // 差分がうまく表示できないので、100%ずつ倍率を変更する
            if (zoom < 1) {
                zoom_ratio = 0.05
            } else if (zoom < 2) {
                zoom_ratio = 0.1
            } else if (zoom < 5) {
                zoom_ratio = 0.2
            } else if (zoom < 10) {
                zoom_ratio = 0.5
            } else {
                zoom_ratio = 1.0
            }

            // すでに最大まで拡大されていたら処理をしない
            if (zoom === MAX_ZOOM) {
                return
            }
        } else {
            // 差分がうまく表示できないので、100%ずつ倍率を変更する
            if (zoom <= 1) {
                zoom_ratio = -0.05
            } else if (zoom <= 2) {
                zoom_ratio = -0.1
            } else if (zoom <= 5) {
                zoom_ratio = -0.2
            } else if (zoom <= 10) {
                zoom_ratio = -0.5
            } else {
                zoom_ratio = -1.0
            }

            // すでに最小まで縮小されていたら処理をしない
            if (zoom === MIN_ZOOM) {
                return
            }
        }

        // 変更前の倍率を取得
        const pre_zoom = zoom       

        // zoom倍率変更
        zoom = Math.round((zoom + zoom_ratio) * 100) / 100
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))

        // 各canvasのサイズを取得 (今は水平分割のみなのでwidthだけ)
        const CANVAS_X = Math.round(window.innerWidth / canvas_num)

        // 画像分割枠内でのマウス位置を計算
        const current_canvas_num = Math.floor(e.pageX / CANVAS_X)
        const SPLIT_PAGE_X = e.pageX - (CANVAS_X * current_canvas_num)

        // 画像のどの位置にいるか
        const ImageX = SPLIT_PAGE_X - START_X
        const ImageY = e.pageY - START_Y

        // 拡大縮小後の座標
        const ZoomX = ImageX * (zoom / pre_zoom)
        const ZoomY = ImageY * (zoom / pre_zoom)

        // 移動量
        const DiffX = ZoomX - ImageX
        const DiffY = ZoomY - ImageY

        // 拡大縮小後の描画開始座標計算
        START_X = START_X - DiffX
        START_Y = START_Y - DiffY

        drawCanvas()
    }

    // - resize時動作
    this.window.addEventListener("resize", function (e) {
        addCanvas(canvas_num)
        drawCanvas()
    })

    // - Canvas追加
    function addCanvas(canvas_num) {
        let viewer_container = document.getElementById("viewer-container")

        // 一度すべての子要素を削除する
        while (viewer_container.firstChild) {
            viewer_container.removeChild(viewer_container.firstChild)
        }

        // 指定の数だけcanvasを追加する
        for (let i = 0; i < canvas_num; i++) {
            // canvasを格納するcontainerの作成
            let canvas_container = document.createElement("div")
            canvas_container.className = "canvas-container"

            // canvasオブジェクト生成
            let canvas = document.createElement("canvas")
            canvas.className = "viewer-canvas"
            // canvas サイズ設定
            canvas.width  = Math.round(window.innerWidth / canvas_num)
            canvas.height = window.innerHeight

            // 比較用ボタン作成
            let compare_button = document.createElement("button")
            compare_button.className   = "compare-button"
            compare_button.textContent = "compare"
            compare_button.id          = `compare-button-id${i}`
            compare_button.addEventListener("mousedown", CompareButtonDown)
            compare_button.addEventListener("mouseup"  , CompareButtonUp)

            // viewer_containerに要素追加
            canvas_container.appendChild(canvas)
            canvas_container.appendChild(compare_button)
            viewer_container.appendChild(canvas_container)
        }

        // 画像描画
        drawCanvas()
    }

    // - Canvasに画像描画
    function drawCanvas() {
        // canvas オブジェクト取得
        let canvas_list = document.getElementsByClassName("viewer-canvas")

        const loop_length = canvas_list.length

        let MAX_DWIDTH  = 0
        let MAX_DHEIGHT = 0
        for (let i = 0; i < loop_length; i++) {
            // canvas取得
            const canvas = canvas_list[i]

            // 一度canvasを非表示にする (描画高速化のため)
            canvas.style.visibility = "hidden"

            // コンテキスト取得
            const ctx = canvas.getContext("2d", { willReadFrequently: true })

            // 描画内容を一度削除する
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // 最近傍補間で拡大する (拡大時、エッジをスムーズに補間しない)
            ctx.imageSmoothingEnabled = false

            if (i in image_data_dict) {
                // 表示する画像を取得
                const target_canvas = image_data_dict[i]["canvas"]
                const image_width   = target_canvas.width
                const image_height  = target_canvas.height

                // 表示場所計算
                let dWidth  = image_width  * zoom // 小数点表示させた方が元画像の倍率が保たれ、差分表示の際に都合が良いためあえてroundなどしない
                let dHeight = image_height * zoom // 小数点表示させた方が元画像の倍率が保たれ、差分表示の際に都合が良いためあえてroundなどしない
                MAX_DWIDTH  = Math.max(MAX_DWIDTH , dWidth)  // 小さいサイズの画像に引っ張られてうまく移動できなくなることを防ぐため
                MAX_DHEIGHT = Math.max(MAX_DHEIGHT, dHeight) // 小さいサイズの画像に引っ張られてうまく移動できなくなることを防ぐため
                dx = Math.min(canvas.width , Math.max(-MAX_DWIDTH , START_X + MOVE_X))
                dy = Math.min(canvas.height, Math.max(-MAX_DHEIGHT, START_Y + MOVE_Y))

                // 描画
                ctx.drawImage(target_canvas, dx, dy, dWidth, dHeight)
            }

            // 再度canvasを表示する (描画高速化のため)
            canvas.style.visibility = "visible"

            // - zoom倍率を表示
            // 初期はcssで透明化させているので、半透明で表示させる
            zoom_ratio_container = document.getElementById("zoom-ratio-container")
            zoom_ratio_container.style.opacity = 0.5

            // ズーム倍率を記載
            p_zoom_ratio = document.getElementById("zoom-ratio")
            p_zoom_ratio.textContent = `zoom: ${Math.round(zoom * 100)}%`
        }
    }

    // - compare buttonの動作
    let image_data_dict_copy = {}
    function CompareButtonDown(e) {
        // idからクリックされたボタンを把握する
        const canvas_id = Number(this.id.replace("compare-button-id", ""))

        if (e.button === 0) {
            // 左クリックで押された場合 --> 重ね合わせする

            // image_data_dictをコピーしておく (deep copy)
            image_data_dict_copy = copyImageDataDict(image_data_dict)

            // クリックされたcanvasに画像がない場合は処理しない
            if ((canvas_id in image_data_dict) === false) return

            // 画像リストを一時的に重ね合わせる画像のパスですべて上書きする
            for (let i = 0; i < canvas_num; i++) {
                if (i === canvas_id) continue // 比較元の画像の時は何もしない

                if (i in image_data_dict) {
                    image_data_dict[i]["path"]   = image_data_dict[canvas_id]["path"]
                    image_data_dict[i]["canvas"] = image_data_dict[canvas_id]["canvas"]
                } else {
                    image_data_dict[i] = {
                        "path"  : image_data_dict[canvas_id]["path"],
                        "canvas": image_data_dict[canvas_id]["canvas"],
                    }
                }
            }

            drawCanvas()
        } else if (e.button === 1) {
            // 中央クリックで押された場合 --> 処理なし
        } else {
            // 右クリックで押された場合 --> 差分表示 (未実装)

            const canvas_list   = document.getElementsByClassName("viewer-canvas")
            const target_canvas = canvas_list[canvas_id]
            const target_ctx    = target_canvas.getContext("2d", {willReadFrequently: true})
            const target_image  = target_ctx.getImageData(0, 0, target_canvas.width, target_canvas.height)

            for (let i = 0; i < canvas_list.length; i++) {
                if (i === canvas_id) {
                    // 比較する画像に対しては何もしない
                } else if ((i in image_data_dict) === false) {
                    // 画像データがないcanvasには何もしない
                } else {
                    // その他の画像は、差分を計算して表示する
                    const canvas = canvas_list[i]
                    const ctx    = canvas.getContext("2d", {willReadFrequently: true})
                    const image  = ctx.getImageData(0, 0, canvas.width, canvas.height)

                    // RBGAの順番で一次元配列に格納されているのでwidth * height * 4のサイズだけループを回している
                    for (let j = 0 ; j < canvas.width * canvas.height * 4; j += 4) {
                        image.data[j + 0] = Math.max(0, Math.min(255, target_image.data[j + 0] - image.data[j + 0] + 128)) // R
                        image.data[j + 1] = Math.max(0, Math.min(255, target_image.data[j + 1] - image.data[j + 1] + 128)) // G
                        image.data[j + 2] = Math.max(0, Math.min(255, target_image.data[j + 2] - image.data[j + 2] + 128)) // B
                        image.data[j + 3] = 255 // A(透明度)は変えない
                    }

                    // 差分画像を書き込み
                    ctx.putImageData(image, 0, 0)
                }
            }
        }
    }

    function CompareButtonUp(e) {
        if (e.button === 0) {
            // 画像リストを元に戻す
            image_data_dict = copyImageDataDict(image_data_dict_copy)
            drawCanvas() // 表示を元に戻す
        } else if (e.button === 1) {
        } else {
            drawCanvas() // 表示を元に戻す
        }
    }

    function readImageData(filepath, num) {
        // 画像を読み込む
        const image = new Image()
        image.src = filepath

        image.addEventListener("load", function() {
            // 一度canvasに書き込む
            const canvas    = document.createElement("canvas")
            canvas.width  = image.naturalWidth
            canvas.height = image.naturalHeight

            const ctx = canvas.getContext("2d", {willReadFrequently: true})
            ctx.drawImage(image, 0, 0)

            image_data_dict[num] = {
                "path"   : filepath,
                "canvas" : canvas,
            }

            drawCanvas()
        })
    }

    function copyImageDataDict(src_dict) {
        let dst_dict = {}

        for (let i = 0; i < Object.keys(src_dict).length; i++) {
            dst_dict[i] = {
                "path"  : src_dict[i]["path"],
                "canvas": src_dict[i]["canvas"],
            }
        }

        return dst_dict
    }

    // // renderer -> main
    // args = ["Sample Message From Renderer"];
    // const renderer_to_main_promise = window.api.renderer_to_main(args);
    // renderer_to_main_promise.then((res, failres) => { // promise objectの使い方がよくわかっていない
    //   console.log(res)
    // })

    // // main -> renderer
    // window.api.on("main_to_renderer", (event, message) => {
    //   console.log(message)
    // })
})