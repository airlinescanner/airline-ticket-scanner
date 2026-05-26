import PIL.Image
import PIL.ImageDraw

# Define dimensions
width = 2048
height = 2048

# Create new image with RGBA
gradient_img = PIL.Image.new('RGBA', (width, height))
draw = PIL.ImageDraw.Draw(gradient_img)

# Color values
# #082D52 -> (8, 45, 82)
# #15466A -> (21, 70, 106)
# #2E6F8F -> (46, 111, 143)
color_top = (8, 45, 82)
color_mid = (21, 70, 106)
color_bot = (46, 111, 143)

# Draw the 3-point vertical gradient
for y in range(height):
    if y < height // 2:
        ratio = y / (height // 2)
        r = int(color_top[0] + (color_mid[0] - color_top[0]) * ratio)
        g = int(color_top[1] + (color_mid[1] - color_top[1]) * ratio)
        b = int(color_top[2] + (color_mid[2] - color_top[2]) * ratio)
    else:
        ratio = (y - height // 2) / (height // 2)
        r = int(color_mid[0] + (color_bot[0] - color_mid[0]) * ratio)
        g = int(color_mid[1] + (color_bot[1] - color_mid[1]) * ratio)
        b = int(color_mid[2] + (color_bot[2] - color_mid[2]) * ratio)
    
    # Draw horizontal line with computed color
    draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

# Load the transparent airplane outline (which is currently the old splash-icon.png)
# We make a copy of it first just in case
plane_img = PIL.Image.open('/Users/ustim/IT/Repositore/check_in_calendar/airline-ticket-scanner/assets/splash-icon.png')

# Center the 1024x1024 plane image on the 2048x2048 gradient canvas
plane_w, plane_h = plane_img.size
offset_x = (width - plane_w) // 2
offset_y = (height - plane_h) // 2

# Paste the plane using itself as the alpha mask
gradient_img.paste(plane_img, (offset_x, offset_y), plane_img)

# Save the final image back to assets/splash-icon.png
gradient_img.save('/Users/ustim/IT/Repositore/check_in_calendar/airline-ticket-scanner/assets/splash-icon.png', 'PNG')
print("Successfully generated gradient splash screen and saved to assets/splash-icon.png")
