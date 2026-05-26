import PIL.Image

img = PIL.Image.open('/Users/ustim/IT/Repositore/check_in_calendar/airline-ticket-scanner/assets/splash-icon.png')
print("Format:", img.format)
print("Size:", img.size)
print("Mode:", img.mode)
if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
    print("Has alpha channel")
    # check corner pixel
    pix = img.convert('RGBA').getpixel((0,0))
    print("Corner pixel alpha:", pix[3])
else:
    print("No alpha channel")
