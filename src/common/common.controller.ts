import { Controller, Get } from '@nestjs/common'
import { INDUSTRY_OPTIONS } from './constants/industry'
import { SOURCE_OPTIONS } from './constants/source'
import * as fs from 'fs'
import * as path from 'path'

@Controller('common')
export class CommonController {
  @Get('industries')
  getIndustries() {
    return { code: 200, message: 'OK', data: INDUSTRY_OPTIONS }
  }

  @Get('sources')
  getSources() {
    return { code: 200, message: 'OK', data: SOURCE_OPTIONS }
  }

  @Get('regions')
  getRegions() {
    try {
      const candidates = [
        path.resolve(__dirname, 'data', 'regions.json'), // dist 目录
        path.resolve(process.cwd(), 'src', 'common', 'data', 'regions.json'), // 源码目录
      ]
      let filePath = ''
      for (const p of candidates) {
        if (fs.existsSync(p)) { filePath = p; break }
      }
      if (!filePath) {
        return { code: 200, message: 'OK', data: [] }
      }
      const content = fs.readFileSync(filePath, 'utf-8')
      const raw = JSON.parse(content)

      const normalize = (input: any): any[] => {
        // 已是 {label,value,children}
        if (Array.isArray(input)) {
          if (input.length === 0) return []
          const first = input[0]
          if (first && typeof first === 'object' && 'label' in first && 'value' in first) {
            return input
          }
          // 可能是 [{ name, code, children }]
          if (first && typeof first === 'object' && 'name' in first) {
            return input.map((n: any) => ({
              label: n.name,
              value: n.name,
              children: normalize(n.children || []),
            }))
          }
        }
        // 对象映射: { 省: { 市: [区] } }
        if (input && typeof input === 'object' && !Array.isArray(input)) {
          return Object.keys(input).map((provName) => {
            const cities = input[provName]
            let cityChildren: any[] = []
            if (Array.isArray(cities)) {
              // 罕见：省 -> 区县数组（无市级）
              cityChildren = cities.map((d: any) => ({ label: d, value: d }))
            } else if (cities && typeof cities === 'object') {
              cityChildren = Object.keys(cities).map((cityName) => {
                const districts = cities[cityName] || []
                const districtChildren = Array.isArray(districts)
                  ? districts.map((d: any) => ({ label: d, value: d }))
                  : []
                return { label: cityName, value: cityName, children: districtChildren }
              })
            }
            return { label: provName, value: provName, children: cityChildren }
          })
        }
        return []
      }

      const data = normalize(raw)
      return { code: 200, message: 'OK', data }
    } catch (e) {
      return { code: 200, message: 'OK', data: [] }
    }
  }
}
