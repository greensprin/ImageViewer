import os
import sys
import time
import shutil

input_path  = sys.argv[1]
output_path = sys.argv[2]

# 出力パスを絶対パスに変換
output_path = os.path.abspath(output_path)

# 出力フォルダを作成
outdir = os.path.dirname(output_path)
if (os.path.exists(outdir) == False):
    os.makedirs(outdir)

input_path = r"C:\Users\mngjx\Pictures\a.b.bmp"
shutil.copy(input_path, output_path)

# 出力ファイルパスをメインプロセス側に連絡
print(output_path)

sys.stdout.flush()