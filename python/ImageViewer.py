import sys
import tkinter as tk
from tkinter import ttk
import math
from PIL import Image, ImageTk

class ImageViewerApp:
    def __init__(self):
        # パラメータ
        ## マウス移動量計算用
        self.mouse_x  = 0
        self.mouse_y  = 0
        self.dragging = False
        ## 画像移動用
        self.offset_x = 0
        self.offset_y = 0
        ## 画像リサイズ用
        self.scale = 1.0

        # root作成
        self.root = tk.Tk()

        # アプリのタイトル
        self.root.title("Image Viewer")   

        # ウィンドウサイズ設定
        self.win_width  = 800
        self.win_height = 600
        self.root.geometry(f"{self.win_width}x{self.win_height}")

        # 画像読み込み
        if (len(sys.argv) < 2):
            print("Usage: python myImageViewer.py <image_path>")
            sys.exit(1)

        img_path = sys.argv[1]
        self.img = Image.open(img_path)
        
        # キャンバス作成
        self.canvas = tk.Canvas(self.root, width=self.win_width, height=self.win_height)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # 初期のリサイズ設定
        scale_x = self.win_width  / self.img.width
        scale_y = self.win_height / self.img.height
        self.scale = math.floor(min(scale_x, scale_y) * 10) / 10

        # 初期オフセット設定
        self.__update_resize()
        self.offset_x = (self.win_width  - self.resize_width ) // 2
        self.offset_y = (self.win_height - self.resize_height) // 2

        # 画像描画
        self.__show_image()

        # 右下に倍率表示
        self.scale_label = ttk.Label(self.root, background="white", padding = (5, 2), relief="solid")
        self.scale_label.place(x=self.win_width - 10, y=self.win_height - 10, anchor=tk.SE)
        self.__update_scale_label()

        # マウスイベント
        ## 画像移動
        self.root.bind("<Button-1>"       , self.__on_mouse_press)
        self.root.bind("<Motion>"         , self.__on_mouse_drag)
        self.root.bind("<ButtonRelease-1>", self.__on_mouse_release)
        ## 画像リサイズ
        self.root.bind("<MouseWheel>"      , self.__on_mouse_wheel)
        ## ウィンドウサイズ変更時のリサイズ
        self.root.after(1000, self.__enable_resize_event)  # 初期化後に一度呼び出す

        # 実行
        self.root.mainloop()

    def __enable_resize_event(self):
        self.root.bind("<Configure>", self.__update_winsize)

    def __show_image(self):
        # キャンバスリセット
        self.canvas.delete("all")

        # canvasのサイズもリサイズ
        self.canvas.config(width=self.resize_width, height=self.resize_height)

        # 画像の切り抜き
        left   = max(0                 ,                 - self.offset_x) / self.scale
        right  = min(self.resize_width , self.win_width  - self.offset_x) / self.scale
        top    = max(0                 ,                 - self.offset_y) / self.scale
        bottom = min(self.resize_height, self.win_height - self.offset_y) / self.scale

        # 画像リサイズ
        img = self.img
        img = img.crop((left, top, right, bottom))

        disp_width  = max(1, int((right - left) * self.scale))
        disp_height = max(1, int((bottom - top) * self.scale))
        img = img.resize((disp_width, disp_height), Image.NEAREST)

        # 描画
        self.img_tk = ImageTk.PhotoImage(img)
        canvas_x = max(0, self.offset_x)
        canvas_y = max(0, self.offset_y)
        self.canvas.create_image(canvas_x, canvas_y, anchor=tk.NW, image=self.img_tk)

    def __on_mouse_press(self, event):
        self.mouse_x  = event.x
        self.mouse_y  = event.y
        self.dragging = True

    def __on_mouse_drag(self, event):
        if self.dragging:
            dx = event.x - self.mouse_x
            dy = event.y - self.mouse_y

            # 画像のオフセットを更新
            offset_x_tmp = self.offset_x + dx
            offset_y_tmp = self.offset_y + dy

            # オフセットの更新
            self.__update_offset(offset_x_tmp, offset_y_tmp)

            # マウス位置を更新
            self.mouse_x = event.x
            self.mouse_y = event.y

            # 画像を再描画
            self.__show_image()

    def __on_mouse_release(self, event):
        self.dragging = False

    def __update_offset(self, offset_x_tmp, offset_y_tmp, scale = None):
        # 倍率設定
        scale = scale if scale is not None else self.scale

        # リサイズ更新 (offsetの更新前に行うことで制限を正しく行う)
        self.__update_resize(scale)

        if (offset_x_tmp >= -self.resize_width  and offset_x_tmp <= max(self.resize_width, self.win_width)):
            self.offset_x = offset_x_tmp
        if (offset_y_tmp >= -self.resize_height and offset_y_tmp <= max(self.resize_height, self.win_height)):
            self.offset_y = offset_y_tmp

    def __update_resize(self, scale = None):
        scale = scale if scale is not None else self.scale

        self.resize_width  = round(self.img.width  * scale)
        self.resize_height = round(self.img.height * scale)

    def __update_winsize(self, event):
        # ウィンドウサイズの更新
        self.win_width  = self.root.winfo_width()
        self.win_height = self.root.winfo_height()

        # ラベルの位置を更新
        self.scale_label.place(x=self.win_width - 10, y=self.win_height - 10, anchor=tk.SE)

        # 画像を再描画
        self.__show_image()

    def __on_mouse_wheel(self, event):
        # マウスの位置を取得
        mouse_x = event.x - self.offset_x
        mouse_y = event.y - self.offset_y

        # 倍率の更新量
        if (event.delta > 0 and self.scale >= 10.0) or (event.delta < 0 and self.scale > 10.0):
            scale_coeff = 0.5
        elif (event.delta > 0 and self.scale >= 5.0) or (event.delta < 0 and self.scale > 5.0):
            scale_coeff = 0.2
        else:
            scale_coeff = 0.1

        # マウスホイールの回転量を取得
        if (event.delta > 0):
            new_scale = self.scale + scale_coeff
        elif (event.delta < 0):
            new_scale = self.scale - scale_coeff

        # 倍率丸め
        new_scale = round(new_scale, 2)

        # 倍率制限
        new_scale = max(0.1, min(new_scale, 50.0))  # 最大5000%
        if (new_scale == self.scale):
            # 倍率変わらない場合は何もしない
            return

        # offsetを更新
        ratio = new_scale / self.scale
        offset_x_tmp = self.offset_x - int((mouse_x * ratio) - mouse_x)
        offset_y_tmp = self.offset_y - int((mouse_y * ratio) - mouse_y)

        # オフセットの更新
        self.__update_offset(offset_x_tmp, offset_y_tmp, new_scale)

        # 拡大縮小倍率を更新
        self.scale = new_scale

        # ラベル更新
        self.__update_scale_label()

        # 再描画
        self.__show_image()

    def __update_scale_label(self):
        self.scale_label["text"] = f"Scale: {round(self.scale * 100)}%"

def main():
    ImageViewerApp()

if __name__ == "__main__":
    main()