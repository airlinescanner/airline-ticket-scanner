import PIL.Image

img = PIL.Image.open('/Users/ustim/.gemini/antigravity-ide/brain/2cb28271-f14e-4dc0-a5f8-4bd119ef47e6/splash_icon_transparent_1779640659984.png')
img_rgba = img.convert('RGBA')
width, height = img_rgba.size

non_transparent_pixels = 0
white_pixels = 0
other_pixels = 0

for y in range(height):
    for x in range(width):
        r, g, b, a = img_rgba.getpixel((x, y))
        if a > 0:
            non_transparent_pixels += 1
            if r > 240 and g > 240 and b > 240:
                white_pixels += 1
            else:
                other_pixels += 1

print("Total non-transparent pixels:", non_transparent_pixels)
print("White pixels (r,g,b > 240):", white_pixels)
print("Other color pixels:", other_pixels)
