# Maintainer: Radhey <https://github.com/jR4dh3y>
pkgname=qckpage-bin
_pkgname=qckpage
pkgver=0.1.2
pkgrel=1
pkgdesc="Fast single-file HTML publishing CLI tool for QckPages"
arch=('x86_64' 'aarch64')
url="https://github.com/jR4dh3y/qckpages"
license=('MIT')
provides=('qckpage')
conflicts=('qckpage')
source_x86_64=("https://github.com/jR4dh3y/qckpages/releases/download/v${pkgver}/qckpage-linux-x64.tar.gz")
source_aarch64=("https://github.com/jR4dh3y/qckpages/releases/download/v${pkgver}/qckpage-linux-aarch64.tar.gz")
sha256sums_x86_64=('SKIP')
sha256sums_aarch64=('SKIP')

package() {
    install -Dm755 "${srcdir}/${_pkgname}" "${pkgdir}/usr/bin/${_pkgname}"
}
