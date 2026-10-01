import numpy as np, json
from scipy.signal import butter, sosfilt, sosfilt_zi
from scipy.io import wavfile
SR=48000; rng=np.random.default_rng(3)
def env(n,a,d): t=np.arange(n)/SR; return np.minimum(1,t/max(a,1e-4))*np.exp(-t/d)
def bp(x,lo,hi,o=2): return sosfilt(butter(o,[lo,hi],'band',fs=SR,output='sos'),x)
def hp(x,f,o=2): return sosfilt(butter(o,f,'high',fs=SR,output='sos'),x)
def lp(x,f,o=2): return sosfilt(butter(o,f,'low',fs=SR,output='sos'),x)
def norm(x,db): return x/np.max(np.abs(x)+1e-9)*10**(db/20)
def sweep_noise(dur,f0,f1,bw=0.6):
    n=int(dur*SR); x=rng.standard_normal(n); y=np.zeros(n); B=256
    for i in range(0,n,B):
        f=f0*(f1/f0)**(i/n); sos=butter(2,[f*(1-bw/2),min(f*(1+bw/2),SR/2-100)],'band',fs=SR,output='sos')
        if i==0: zi=sosfilt_zi(sos)*0
        y[i:i+B],zi=sosfilt(sos,x[i:i+B],zi=zi)
    return y
def boom():
    d=0.9;n=int(d*SR);t=np.arange(n)/SR
    f=45+110*np.exp(-t*9); ph=2*np.pi*np.cumsum(f)/SR
    body=np.sin(ph)*env(n,.002,.28)
    click=lp(rng.standard_normal(n),3000)*env(n,.0005,.012)
    tail=lp(rng.standard_normal(n),900)*env(n,.005,.18)*.35
    return norm(np.tanh(1.6*(body+.6*click+tail)),-3)
def whoosh(d=.42,up=True):
    n=int(d*SR); y=sweep_noise(d,500,4500) if up else sweep_noise(d,3500,400)
    t=np.arange(n)/n; e=np.sin(np.pi*t**(.7 if up else 1.3))**2
    return norm(y*e,-8)
def pop(f0=900,f1=320):
    d=.09;n=int(d*SR);t=np.arange(n)/SR; f=f1+(f0-f1)*np.exp(-t*60)
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.001,.03)
    return norm(s+.15*hp(rng.standard_normal(n),3000)*env(n,.0003,.004),-9)
def click():
    n=int(.025*SR); s=bp(rng.standard_normal(n),1800,7000)*env(n,.0002,.004)
    s+=np.sin(2*np.pi*rng.uniform(1800,2400)*np.arange(n)/SR)*env(n,.0002,.003)*.4
    return norm(s,-20-rng.uniform(0,4))
def ding():
    n=int(1.4*SR);t=np.arange(n)/SR
    s=sum(a*np.sin(2*np.pi*f*t)*np.exp(-t*k) for f,a,k in [(1318.5,1,3),(1975.5,.5,4),(2637,.25,6),(659.25,.3,3)])
    s2=np.zeros(n);o=int(.09*SR);t2=t[:n-o]
    s2[o:]=sum(a*np.sin(2*np.pi*f*t2)*np.exp(-t2*k) for f,a,k in [(1760,1,2.6),(2637,.4,4)])
    return norm((s+s2)*np.minimum(1,t/.004),-9)
def glitch():
    n=int(.3*SR); x=np.zeros(n)
    for st,ln,f in [(0,.05,180),(.08,.04,90),(.15,.07,260)]:
        a=int(st*SR);b=a+int(ln*SR);tt=np.arange(b-a)/SR
        sq=np.sign(np.sin(2*np.pi*f*tt))*.5+np.round(rng.standard_normal(b-a)*3)/6
        x[a:b]=sq*np.hanning(b-a)**.3
    return norm(lp(x,6000),-12)
def thud():
    d=.5;n=int(d*SR);t=np.arange(n)/SR;f=70+60*np.exp(-t*20)
    return norm(np.tanh(2*np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.002,.12))+.3*lp(rng.standard_normal(n),1500)*env(n,.0005,.02),-6)
def swipe():
    d=.32;y=sweep_noise(d,1200,5000,.5);t=np.linspace(0,1,len(y));return norm(y*np.sin(np.pi*t)**1.5,-12)
def buzz():
    n=int(.36*SR);x=np.zeros(n)
    for st in (0,.18):
        a=int(st*SR);b=a+int(.13*SR);tt=np.arange(b-a)/SR
        x[a:b]=(2*((140*tt)%1)-1)*np.hanning(b-a)**.2
    return norm(lp(x,2200),-17)
C=json.load(open('motion/cards.json')); TOTAL=C['total']
mix=np.zeros(int((TOTAL+1.5)*SR))
def put(s,t,g=0):
    a=int(t*SR); b=min(len(mix),a+len(s)); mix[a:b]+=s[:b-a]*10**(g/20)
# hook
put(boom(),0.0); put(whoosh(.3),0.0,-4); put(boom(),0.74,-4); put(glitch(),0.95,-2); put(pop(1200,500),1.4,-6)
# 通常不會 / 好看太模糊
put(thud(),C['nope'][0]); put(pop(),C['blur'][0]); put(whoosh(.5,False),C['blurB'],-6)
# scene A
A=C['sA']; put(whoosh(),A['in']-.12)
for k,f in zip(['q1','q2','q3','q4'],[800,950,1100,1250]): put(pop(f,f*.4),A[k])
put(whoosh(.35,False),A['out']-.05,-2)
# strike
put(pop(700,250),C['strike'][0],-2); put(swipe(),C['strikeAt']); put(buzz(),C['strikeAt']+.25)
# scene B
B=C['sB']; put(whoosh(),B['in']-.12)
BAD=8
for i in range(BAD): put(click(),B['del']+i*(B['delEnd']-B['del'])/BAD)
for st,txt in zip(B['lines'],['這支影片在講什麼','要在哪裡切開','哪一句最重要','字卡、音效何時出現']):
    put(pop(1000,600),st,-6)
    for j in range(len(txt)): put(click(),st+j*.055)
put(ding(),B['send'])
mix=np.tanh(mix*1.1)/1.1
wavfile.write('sfx.wav',SR,(np.stack([mix,mix],1)*32767*.95).astype(np.int16))
print('sfx peak dBFS', 20*np.log10(np.max(np.abs(mix))), 'len', len(mix)/SR)
# end card
if 'sE' in C:
    E=C['sE']['in']; mix2=np.zeros(len(mix))
    put(whoosh(),E-.12); put(pop(900,400),E+.25,-4); put(pop(1100,500),E+.45,-4); put(pop(1300,600),E+.8,-2)
    mix=np.tanh(mix*1.1)/1.1
    wavfile.write('sfx.wav',SR,(np.stack([mix,mix],1)*32767*.95).astype(np.int16)); print('with end card')
